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

internal enum CoordinatorRequestKind: Equatable {
    case advancedSubmit
    case advancedAdditionalDetails
    case sessionBeforeSubmit
    case addressLookup
    case unsupportedCapability
}

internal struct CoordinatorRequest: Equatable {
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
    private var activeRequest: CoordinatorRequest?
    private var activeRequestCancellation: CoordinatorCancellation?

    init() {
        configuredDependencies = nil
    }

    init(dependencies: CheckoutCoordinatorDependencies) {
        configuredDependencies = dependencies
    }

    internal var checkoutID: String? {
        activeCheckoutID
    }

    /// Replacement always disposes first. A factory failure leaves the coordinator idle.
    @discardableResult
    internal func setup() async throws -> String {
        invalidate()

        let checkout = try await dependencies.checkoutFactory.makeCheckout()
        let checkoutID = dependencies.identityGenerator.nextID(for: .checkout)
        activeCheckout = checkout
        activeCheckoutID = checkoutID
        dependencies.eventSink.emit(.activated(checkoutID: checkoutID))
        return checkoutID
    }

    /// Enforces the cross-presenter single-operation constraint without queueing.
    internal func beginOperation() throws -> String {
        guard activeCheckoutID != nil else {
            throw CoordinatorError.noActiveCheckout
        }
        guard activeOperationID == nil else {
            dependencies.eventSink.emit(.operationBusy)
            throw CoordinatorError.operationBusy
        }

        let operationID = dependencies.identityGenerator.nextID(for: .operation)
        activePresenter = dependencies.presenterFactory.makePresenter()
        activeOperationID = operationID
        return operationID
    }

    @discardableResult
    internal func beginRequest(
        operationID: String,
        kind: CoordinatorRequestKind,
        timeout: TimeInterval
    ) throws -> CoordinatorRequest {
        guard let checkoutID = activeCheckoutID, activeOperationID == operationID else {
            throw CoordinatorError.staleOperation
        }

        settleActiveRequest()
        let request = CoordinatorRequest(
            checkoutID: checkoutID,
            operationID: operationID,
            requestID: dependencies.identityGenerator.nextID(for: .request),
            kind: kind
        )
        activeRequest = request
        activeRequestCancellation = dependencies.scheduler.schedule(after: timeout) { [weak self] in
            self?.timeout(request)
        }
        dependencies.eventSink.emit(.request(request))
        return request
    }

    /// Returns false for stale, duplicate, wrong-kind, or late responses.
    @discardableResult
    internal func resolve(_ request: CoordinatorRequest) -> Bool {
        guard activeRequest == request else {
            dependencies.eventSink.emit(.staleRequest(request))
            return false
        }
        settleActiveRequest()
        return true
    }

    internal func completeOperation(_ operationID: String) {
        guard activeOperationID == operationID else { return }
        settleActiveRequest()
        activePresenter?.dispose()
        activePresenter = nil
        activeOperationID = nil
    }

    /// Native cleanup owns cancellation and host release even when JavaScript does not respond.
    internal func invalidate() {
        settleActiveRequest()
        activePresenter?.dispose()
        activePresenter = nil
        activeOperationID = nil

        guard let checkoutID = activeCheckoutID else { return }
        activeCheckout?.dispose()
        activeCheckout = nil
        activeCheckoutID = nil
        dependencies.hostAdapter.releaseCheckoutHost()
        dependencies.eventSink.emit(.cleanedUp(checkoutID: checkoutID))
    }

    private func timeout(_ request: CoordinatorRequest) {
        guard activeRequest == request else { return }
        dependencies.eventSink.emit(.staleRequest(request))
        settleActiveRequest()
    }

    private func settleActiveRequest() {
        activeRequestCancellation?.cancel()
        activeRequestCancellation = nil
        activeRequest = nil
    }
}

internal enum CoordinatorError: Error {
    case noActiveCheckout
    case operationBusy
    case staleOperation
}
