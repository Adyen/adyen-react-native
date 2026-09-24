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
    func releaseCheckoutHost() async
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
    case addressLookupSearch
    case addressLookupSelection
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
    internal var checkoutState: CheckoutState?
    internal var presenterStack: [UIViewController] = []
    internal var topPresenterProvider: @MainActor () -> UIViewController? = { UIViewController.topPresenter }

    private let configuredDependencies: CheckoutCoordinatorDependencies?
    private var runtimeDependencies: CheckoutCoordinatorDependencies?
    private var dependencies: CheckoutCoordinatorDependencies {
        guard let dependencies = configuredDependencies ?? runtimeDependencies else {
            preconditionFailure("CheckoutCoordinator production dependencies are not configured")
        }
        return dependencies
    }

    private var activeCheckout: CoordinatorCheckout?
    private var activeCheckoutID: String?
    private var activePresenter: CoordinatorPresenter?
    private var activeOperationID: String?
    private var activeOperationKind: OperationKind?
    /// Lookup has UI state that survives a completed search while the shopper chooses a
    /// candidate. It owns a dedicated embedded operation and must never borrow an explicit
    /// headless/Drop-in operation that happens to be active.
    private var addressLookupOperationID: String?
    private var passivePresenters: [String: PassivePresenter] = [:]
    private var passivePresenterIDsByTarget: [TurboCheckoutTarget: String] = [:]
    private var activeRequests: [String: PendingRequest] = [:]
    private var setupGeneration = 0
    private var isSettingUp = false
    /// Identifies the generated module instance that started the active or pending flow. Runtime
    /// callbacks from a replaced module must not tear down its replacement.
    private var lifecycleOwnerID: String?
    /// A single dismissal is shared by every caller that reaches cleanup while it is in flight.
    /// Keeping this task visible also prevents a replacement from creating or publishing a new
    /// checkout before coordinator-owned UI has been dismissed.
    private var disposingTask: Task<Void, Never>?
    private var disposingCheckoutID: String?
    private var disposalGeneration = 0

    private struct PendingRequest {
        let request: CoordinatorRequest
        let cancellation: CoordinatorCancellation?
        let cancellationFallback: @MainActor () -> Void
    }

    private struct PassivePresenter {
        let checkoutID: String
        let target: TurboCheckoutTarget
        let presenter: CoordinatorPresenter
    }

    private enum OperationKind {
        case explicit
        case embedded
        case addressLookup
    }

    internal enum EmbeddedOperationAcquisition {
        case acquired(String)
        case explicit(String)
        case competing
    }

    init() {
        configuredDependencies = nil
    }

    init(dependencies: CheckoutCoordinatorDependencies) {
        configuredDependencies = dependencies
    }

    /// The generated TurboModule installs concrete runtime adapters after its event emitter is
    /// available. Test coordinators keep their constructor-injected seams unchanged.
    internal func configureRuntimeDependencies(_ dependencies: CheckoutCoordinatorDependencies) {
        guard configuredDependencies == nil else { return }
        runtimeDependencies = dependencies
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

    internal var passivePresenterCount: Int {
        passivePresenters.count
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
        try await setup(ownerID: nil) {
            try await self.dependencies.checkoutFactory.makeCheckout()
        }
    }

    /// Creates and commits a checkout transactionally. The candidate remains private until the
    /// factory succeeds and this setup transaction is still current.
    @discardableResult
    internal func setup(
        ownerID: String? = nil,
        makeCheckout: @escaping @MainActor () async throws -> CoordinatorCheckout
    ) async throws -> String {
        guard !isSettingUp else {
            throw CoordinatorError.checkoutBusy
        }

        isSettingUp = true
        setupGeneration += 1
        let generation = setupGeneration
        lifecycleOwnerID = ownerID
        await disposeActiveFlow()

        guard isSettingUp, setupGeneration == generation else {
            throw CoordinatorError.staleOperation
        }

        let checkout: CoordinatorCheckout
        do {
            checkout = try await makeCheckout()
        } catch {
            if setupGeneration == generation {
                isSettingUp = false
                lifecycleOwnerID = nil
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
            guard let factory = self.configuredDependencies ?? self.runtimeDependencies else {
                return NoopCoordinatorPresenter()
            }
            return factory.presenterFactory.makePresenter()
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
        activeOperationKind = .explicit
        return operationID
    }

    internal func beginOperation(checkoutID: String) throws -> String {
        guard activeCheckoutID == checkoutID else {
            throw CoordinatorError.staleCheckout
        }
        return try beginOperation()
    }

    /// Acquires the checkout-level embedded operation at the first SDK callback. The callback
    /// carries no source-view identity, so this never consults a presenter registry or target key.
    /// A competing callback must return the SDK retry outcome without a merchant event.
    internal func acquireEmbeddedOperation(checkoutID: String) -> String? {
        switch acquireInitialEmbeddedOperation(checkoutID: checkoutID) {
        case let .acquired(operationID), let .explicit(operationID):
            return operationID
        case .competing:
            return nil
        }
    }

    /// Initial advanced/session callbacks use this result to return the SDK retry/abort outcome
    /// for an unexpected second embedded callback without emitting a merchant event.
    internal func acquireInitialEmbeddedOperation(checkoutID: String) -> EmbeddedOperationAcquisition {
        guard activeCheckoutID == checkoutID else { return .competing }
        if let activeOperationID {
            if activeOperationKind == .explicit {
                return .explicit(activeOperationID)
            }
            debugPrint("Assertion failure: competing embedded checkout callback")
            return .competing
        }
        let operationID = nextID(for: .operation)
        activeOperationID = operationID
        activeOperationKind = .embedded
        return .acquired(operationID)
    }

    /// Advanced retry returns the checkout to its passive embedded state. Action and additional
    /// details deliberately retain the operation until a terminal callback cleans the checkout.
    internal func releaseEmbeddedOperation(_ operationID: String) {
        guard activeOperationID == operationID, activeOperationKind == .embedded else { return }
        settleRequests(for: operationID)
        activeOperationID = nil
        activeOperationKind = nil
    }

    /// Address lookup is an embedded SDK callback with its own lifecycle. Search callbacks can
    /// recur while lookup UI remains visible, so each search and the later selection share this
    /// one operation. An unrelated explicit operation is a contender, never a lookup owner.
    internal func acquireAddressLookupOperation(checkoutID: String) throws -> String {
        guard activeCheckoutID == checkoutID else {
            throw CoordinatorError.staleCheckout
        }
        if let addressLookupOperationID {
            guard activeOperationID == addressLookupOperationID,
                  activeOperationKind == .addressLookup else {
                throw CoordinatorError.staleOperation
            }
            return addressLookupOperationID
        }
        guard activeOperationID == nil else {
            emit(.operationBusy)
            throw CoordinatorError.operationBusy
        }
        let operationID = nextID(for: .operation)
        activeOperationID = operationID
        activeOperationKind = .addressLookup
        addressLookupOperationID = operationID
        return operationID
    }

    /// Selection is the lookup terminal boundary. Its confirmation or rejection must release the
    /// dedicated operation before a session before-submit callback can acquire a fresh one.
    internal func completeAddressLookupOperation(_ operationID: String) {
        guard addressLookupOperationID == operationID,
              activeOperationID == operationID,
              activeOperationKind == .addressLookup else {
            return
        }
        settleRequests(for: operationID)
        activeOperationID = nil
        activeOperationKind = nil
        addressLookupOperationID = nil
    }

    /// Registers a mounted Fabric view without acquiring the interactive operation slot.
    ///
    /// The SDK can only create regular components by exact payment-method type and stored
    /// components by exact stored ID. TODO: use subtype/funding-source in this key once the
    /// published native component-creation API accepts that precision.
    internal func registerPassivePresenter(
        checkoutID: String,
        presenterID: String,
        target: TurboCheckoutTarget,
        presenter: CoordinatorPresenter
    ) throws {
        guard activeCheckoutID == checkoutID else {
            throw CoordinatorError.staleCheckout
        }
        if let existing = passivePresenters[presenterID] {
            guard existing.presenter === presenter,
                  existing.checkoutID == checkoutID,
                  existing.target == target else {
                throw CoordinatorError.presenterIDCollision
            }
            return
        }
        guard passivePresenterIDsByTarget[target] == nil else {
            throw CoordinatorError.duplicatePresenterTarget
        }
        passivePresenters[presenterID] = PassivePresenter(checkoutID: checkoutID, target: target, presenter: presenter)
        passivePresenterIDsByTarget[target] = presenterID
    }

    /// Removal is identity-bound so a delayed recycle or unmount cannot unregister a newer
    /// presenter that happens to reuse the same Fabric registration token.
    internal func unregisterPassivePresenter(
        checkoutID: String,
        presenterID: String,
        presenter: CoordinatorPresenter
    ) {
        guard let existing = passivePresenters[presenterID],
              existing.checkoutID == checkoutID,
              existing.presenter === presenter else {
            return
        }
        passivePresenters.removeValue(forKey: presenterID)
        if passivePresenterIDsByTarget[existing.target] == presenterID {
            passivePresenterIDsByTarget.removeValue(forKey: existing.target)
        }
        if passivePresenters.isEmpty {
            cancelAddressLookup(checkoutID: checkoutID)
        }
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
        let cancellation = (configuredDependencies ?? runtimeDependencies)?.scheduler.schedule(after: timeout) { [weak self] in
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

    /// Retires an exact request when a native SDK callback supersedes it before JavaScript
    /// responds. The fallback is responsible for settling that request's native continuation.
    @discardableResult
    internal func cancel(_ request: CoordinatorRequest) -> Bool {
        guard let pending = activeRequests[request.requestID], pending.request == request else {
            return false
        }
        settle(requestID: request.requestID, invokeFallback: true)
        return true
    }

    internal func completeOperation(_ operationID: String) {
        guard activeOperationID == operationID else { return }
        settleRequests(for: operationID)
        activePresenter?.dispose()
        activePresenter = nil
        activeOperationID = nil
        activeOperationKind = nil
        if addressLookupOperationID == operationID {
            addressLookupOperationID = nil
        }
    }

    /// A Fabric view can be removed while the SDK lookup UI is awaiting candidates or a
    /// confirmation. This is scoped to its active checkout and never lets stale unmounts touch a
    /// replacement checkout.
    internal func cancelAddressLookup(checkoutID: String) {
        guard activeCheckoutID == checkoutID,
              let operationID = addressLookupOperationID,
              activeOperationID == operationID,
              activeOperationKind == .addressLookup else {
            return
        }
        let requestIDs = activeRequests.values
            .filter {
                $0.request.operationID == operationID &&
                    ($0.request.kind == .addressLookupSearch || $0.request.kind == .addressLookupSelection)
            }
            .map(\.request.requestID)
        requestIDs.forEach { settle(requestID: $0, invokeFallback: true) }
        addressLookupOperationID = nil
        activeOperationID = nil
        activeOperationKind = nil
    }

    /// Native cleanup owns cancellation and host release even when JavaScript does not respond.
    internal func invalidate() async {
        setupGeneration += 1
        isSettingUp = false
        lifecycleOwnerID = nil
        await disposeActiveFlow()
    }

    internal func invalidate(checkoutID: String) async throws {
        if activeCheckoutID == checkoutID {
            await invalidate()
            return
        }
        if disposingCheckoutID == checkoutID, let disposingTask {
            await disposingTask.value
            return
        }
        throw CoordinatorError.staleCheckout
    }

    /// Host ownership is weak at the UIKit boundary. When its view controller goes away, the
    /// coordinator settles only the flow owned by that generated module instance and never tries
    /// to dismiss a replacement published by another instance.
    internal func hostDidDisappear(ownerID: String) async {
        guard lifecycleOwnerID == ownerID else { return }
        await invalidate()
    }

    /// Direct coordinator host-loss entry point used by native lifecycle vectors. Runtime module
    /// teardown must use the owner-bound overload above.
    internal func hostDidDisappear() async {
        await invalidate()
    }

    private func disposeActiveFlow() async {
        if let disposingTask {
            await disposingTask.value
            return
        }

        settleAllRequests()
        activePresenter?.dispose()
        activePresenter = nil
        activeOperationID = nil
        activeOperationKind = nil
        addressLookupOperationID = nil
        let presenters = passivePresenters.values.map(\.presenter)
        passivePresenters.removeAll()
        passivePresenterIDsByTarget.removeAll()
        presenters.forEach { $0.dispose() }

        guard let checkoutID = activeCheckoutID else { return }
        activeCheckout?.dispose()
        activeCheckout = nil
        activeCheckoutID = nil
        checkoutState = nil
        let hostAdapter = (configuredDependencies ?? runtimeDependencies)?.hostAdapter
        disposalGeneration += 1
        let generation = disposalGeneration
        disposingCheckoutID = checkoutID
        let task = Task { @MainActor in
            if let hostAdapter {
                await hostAdapter.releaseCheckoutHost()
            }
        }
        disposingTask = task
        await task.value
        if disposalGeneration == generation {
            disposingTask = nil
            disposingCheckoutID = nil
        }
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
        (configuredDependencies ?? runtimeDependencies)?.identityGenerator.nextID(for: kind) ?? UUID().uuidString
    }

    private func emit(_ event: CoordinatorEvent) {
        (configuredDependencies ?? runtimeDependencies)?.eventSink.emit(event)
    }
}

internal enum CoordinatorError: Error {
    case noActiveCheckout
    case checkoutBusy
    case operationBusy
    case staleCheckout
    case staleOperation
    case presenterIDCollision
    case duplicatePresenterTarget
}

@MainActor
private final class NoopCoordinatorPresenter: CoordinatorPresenter {
    func dispose() {}
}
