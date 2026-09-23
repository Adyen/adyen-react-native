//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import AdyenCheckout
import Foundation
import UIKit

/// Testable dependencies for the native checkout lifecycle. These are internal seams, never bridge
/// controls, so production code cannot manufacture lifecycle faults through JavaScript.
@MainActor
internal struct CheckoutCoordinatorDependencies {
    let checkoutFactory: CheckoutFactory
    let presenterFactory: PresenterFactory
    let eventSink: CheckoutEventSink
    let identityGenerator: CheckoutIdentityGenerator
    let scheduler: CheckoutScheduler
    let hostAdapter: CheckoutHostAdapter
}

@MainActor
internal protocol CheckoutFactory {
    func makeCheckout() async throws -> CoordinatorCheckout
}

@MainActor
internal protocol CoordinatorCheckout: AnyObject {
    var checkoutState: CheckoutState? { get }
    func dispose()
}

@MainActor
internal protocol PresenterFactory {
    func makePresenter() -> CoordinatorPresenter
}

@MainActor
internal protocol CoordinatorPresenter: AnyObject {
    func dispose()
}

@MainActor
internal protocol CheckoutEventSink {
    func emit(_ event: CoordinatorEvent)
}

@MainActor
internal protocol CheckoutIdentityGenerator {
    func nextID(for kind: CoordinatorIdentityKind) -> String
}

@MainActor
internal protocol CheckoutScheduler {
    func schedule(after interval: TimeInterval, action: @escaping @MainActor () -> Void) -> CoordinatorCancellation
}

@MainActor
internal protocol CoordinatorCancellation {
    func cancel()
}

@MainActor
internal protocol CheckoutHostAdapter {
    func releaseCheckoutHost()
}

internal enum CoordinatorIdentityKind: Hashable {
    case checkout
    case operation
    case request
}

internal enum CoordinatorRequestKind: Hashable {
    case advancedSubmit
    case advancedAdditionalDetails
    case sessionBeforeSubmit
    case applePayAuthorization
    case applePayShippingContact
    case applePayShippingMethod
    case applePayCouponCode
}

internal struct CoordinatorRequest: Hashable {
    let checkoutID: String
    let operationID: String
    let requestID: String
    let kind: CoordinatorRequestKind
}

internal enum CoordinatorEvent: Equatable {
    case activated(checkoutID: String)
    case request(CoordinatorRequest)
    case staleRequest(CoordinatorRequest)
    case operationBusy
    case cleanedUp(checkoutID: String)
}

/// Owns an SDK checkout candidate after it has been built but before it is committed. The
/// coordinator is the only object that keeps this flow alive after setup succeeds.
@MainActor
internal final class NativeCheckoutFlow: CoordinatorCheckout {

    let checkoutContext: PaymentCheckout
    private let disposeResources: @MainActor () -> Void
    private var isDisposed = false

    init(checkoutContext: PaymentCheckout, disposeResources: @escaping @MainActor () -> Void) {
        self.checkoutContext = checkoutContext
        self.disposeResources = disposeResources
    }

    var checkoutState: CheckoutState? {
        CheckoutState(checkoutContext: checkoutContext)
    }

    func dispose() {
        guard !isDisposed else { return }
        isDisposed = true
        disposeResources()
    }
}

/// The sole owner for checkout lifecycle state. UIKit callers cross this main-actor boundary before
/// observing or changing the active checkout, presenter, request, or host state.
@MainActor
internal final class CheckoutCoordinator {

    /// The process-scoped singleton is the only lifecycle owner. It retains no test seam overrides;
    /// production adapters will be supplied by the TurboModule integration.
    internal static let shared = CheckoutCoordinator()

    /// Legacy module paths use this coordinator-owned state until their public commands migrate.
    /// Keeping it here prevents modules and views from owning parallel checkout or presenter state.
    internal nonisolated(unsafe) var checkoutState: CheckoutState?
    internal nonisolated(unsafe) var presenterStack: [UIViewController] = []
    internal nonisolated(unsafe) var topPresenterProvider: @MainActor () -> UIViewController? = { UIViewController.topPresenter }

    private let configuredDependencies: CheckoutCoordinatorDependencies?
    private var dependencies: CheckoutCoordinatorDependencies {
        guard let configuredDependencies else {
            preconditionFailure("CheckoutCoordinator production dependencies are not configured")
        }
        return configuredDependencies
    }

    private var activeCheckout: CoordinatorCheckout?
    private var activeCheckoutID: String?
    private var activePresenter: CoordinatorPresenter?
    private var activeOperationID: String?
    private var activeRequests: [String: PendingRequest] = [:]
    private var setupGeneration = 0
    private var isSettingUp = false

    private struct PendingRequest {
        let request: CoordinatorRequest
        let cancellation: CoordinatorCancellation?
        let cancellationFallback: @MainActor () -> Void
    }

    init() {
        configuredDependencies = nil
    }

    init(dependencies: CheckoutCoordinatorDependencies) {
        configuredDependencies = dependencies
    }

    internal var checkoutID: String? {
        activeCheckoutID
    }

    internal var operationID: String? {
        activeOperationID
    }

    internal var pendingRequestCount: Int {
        activeRequests.count
    }

    internal func isActive(checkoutID: String) -> Bool {
        activeCheckoutID == checkoutID
    }

    internal func owns(checkout: PaymentCheckout) -> Bool {
        checkoutState?.checkoutContext === checkout
    }

    /// Replacement always disposes first. A factory failure leaves the coordinator idle.
    @discardableResult
    internal func setup() async throws -> String {
        try await setup {
            try await self.dependencies.checkoutFactory.makeCheckout()
        }
    }

    /// Creates and commits a checkout transactionally. The candidate remains private until the
    /// factory succeeds and this setup transaction is still current.
    @discardableResult
    internal func setup(makeCheckout: @escaping @MainActor () async throws -> CoordinatorCheckout) async throws -> String {
        guard !isSettingUp else {
            throw CoordinatorError.checkoutBusy
        }

        disposeActiveFlow()
        isSettingUp = true
        setupGeneration += 1
        let generation = setupGeneration

        let checkout: CoordinatorCheckout
        do {
            checkout = try await makeCheckout()
        } catch {
            if setupGeneration == generation {
                isSettingUp = false
            }
            throw error
        }

        guard isSettingUp, setupGeneration == generation else {
            checkout.dispose()
            throw CoordinatorError.staleOperation
        }

        let checkoutID = nextID(for: .checkout)
        activeCheckout = checkout
        activeCheckoutID = checkoutID
        checkoutState = checkout.checkoutState
        isSettingUp = false
        emit(.activated(checkoutID: checkoutID))
        return checkoutID
    }

    /// Enforces the cross-presenter single-operation constraint without queueing.
    internal func beginOperation() throws -> String {
        try beginOperation {
            guard let factory = self.configuredDependencies?.presenterFactory else {
                return NoopCoordinatorPresenter()
            }
            return factory.makePresenter()
        }
    }

    /// Reserves the operation slot before creating a presenter. A busy contender therefore cannot
    /// allocate a component, controller, or UIKit resource that it does not own.
    internal func beginOperation(
        makePresenter: @escaping @MainActor () throws -> CoordinatorPresenter
    ) throws -> String {
        guard activeCheckoutID != nil else {
            throw CoordinatorError.noActiveCheckout
        }
        guard activeOperationID == nil else {
            emit(.operationBusy)
            throw CoordinatorError.operationBusy
        }

        let operationID = nextID(for: .operation)
        activePresenter = try makePresenter()
        activeOperationID = operationID
        return operationID
    }

    internal func beginOperation(checkoutID: String) throws -> String {
        guard activeCheckoutID == checkoutID else {
            throw CoordinatorError.staleCheckout
        }
        return try beginOperation()
    }

    @discardableResult
    internal func beginRequest(
        operationID: String,
        kind: CoordinatorRequestKind,
        timeout: TimeInterval,
        cancellationFallback: @escaping @MainActor () -> Void = {}
    ) throws -> CoordinatorRequest {
        guard let checkoutID = activeCheckoutID, activeOperationID == operationID else {
            throw CoordinatorError.staleOperation
        }

        let request = CoordinatorRequest(
            checkoutID: checkoutID,
            operationID: operationID,
            requestID: nextID(for: .request),
            kind: kind
        )
        let cancellation = configuredDependencies?.scheduler.schedule(after: timeout) { [weak self] in
            self?.timeout(request)
        }
        activeRequests[request.requestID] = PendingRequest(
            request: request,
            cancellation: cancellation,
            cancellationFallback: cancellationFallback
        )
        emit(.request(request))
        return request
    }

    /// Returns false for stale, duplicate, wrong-kind, or late responses.
    @discardableResult
    internal func resolve(_ request: CoordinatorRequest) -> Bool {
        guard let pending = activeRequests[request.requestID], pending.request == request else {
            emit(.staleRequest(request))
            return false
        }
        settle(requestID: request.requestID, invokeFallback: false)
        return true
    }

    internal func completeOperation(_ operationID: String) {
        guard activeOperationID == operationID else { return }
        settleRequests(for: operationID)
        activePresenter?.dispose()
        activePresenter = nil
        activeOperationID = nil
    }

    /// Native cleanup owns cancellation and host release even when JavaScript does not respond.
    internal func invalidate() {
        setupGeneration += 1
        isSettingUp = false
        disposeActiveFlow()
    }

    internal func invalidate(checkoutID: String) throws {
        guard activeCheckoutID == checkoutID else {
            throw CoordinatorError.staleCheckout
        }
        invalidate()
    }

    /// Host ownership is weak at the UIKit boundary. When its view controller goes away, the
    /// coordinator settles only its own flow and never tries to dismiss foreign presentation.
    internal func hostDidDisappear() {
        invalidate()
    }

    private func disposeActiveFlow() {
        settleAllRequests()
        activePresenter?.dispose()
        activePresenter = nil
        activeOperationID = nil

        guard let checkoutID = activeCheckoutID else { return }
        activeCheckout?.dispose()
        activeCheckout = nil
        activeCheckoutID = nil
        checkoutState = nil
        configuredDependencies?.hostAdapter.releaseCheckoutHost()
        emit(.cleanedUp(checkoutID: checkoutID))
    }

    private func timeout(_ request: CoordinatorRequest) {
        guard activeRequests[request.requestID]?.request == request else { return }
        emit(.staleRequest(request))
        settle(requestID: request.requestID, invokeFallback: true)
    }

    private func settleRequests(for operationID: String) {
        let requestIDs = activeRequests.values
            .filter { $0.request.operationID == operationID }
            .map(\.request.requestID)
        requestIDs.forEach { settle(requestID: $0, invokeFallback: true) }
    }

    private func settleAllRequests() {
        let requestIDs = Array(activeRequests.keys)
        requestIDs.forEach { settle(requestID: $0, invokeFallback: true) }
    }

    private func settle(requestID: String, invokeFallback: Bool) {
        guard let pending = activeRequests.removeValue(forKey: requestID) else { return }
        pending.cancellation?.cancel()
        if invokeFallback {
            pending.cancellationFallback()
        }
    }

    private func nextID(for kind: CoordinatorIdentityKind) -> String {
        configuredDependencies?.identityGenerator.nextID(for: kind) ?? UUID().uuidString
    }

    private func emit(_ event: CoordinatorEvent) {
        configuredDependencies?.eventSink.emit(event)
    }
}

internal enum CoordinatorError: Error {
    case noActiveCheckout
    case checkoutBusy
    case operationBusy
    case staleCheckout
    case staleOperation
}

@MainActor
private final class NoopCoordinatorPresenter: CoordinatorPresenter {
    func dispose() {}
}
