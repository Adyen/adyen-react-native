//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

@testable import adyen_react_native
import XCTest

@MainActor
final class CheckoutCoordinatorTests: XCTestCase {

    func test_replacementDisposesBeforeCreatingTheNextCheckout() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()

        _ = try await coordinator.setup()
        _ = try await coordinator.setup()

        XCTAssertEqual(fixture.log, ["create-1", "dispose-1", "host-release", "create-2"])
        XCTAssertEqual(coordinator.checkoutID, "checkout-2")
    }

    func test_failedReplacementLeavesCoordinatorIdle() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        _ = try await coordinator.setup()
        fixture.factory.shouldFail = true

        do {
            _ = try await coordinator.setup()
            XCTFail("Expected the checkout factory failure")
        } catch {
            XCTAssertNil(coordinator.checkoutID)
            XCTAssertEqual(fixture.log, ["create-1", "dispose-1", "host-release", "create-failed"])
        }
    }

    func test_contentionAndStaleRequestNeverSettleCurrentRequest() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        _ = try await coordinator.setup()
        let operationID = try coordinator.beginOperation()
        let request = try coordinator.beginRequest(operationID: operationID, kind: .advancedSubmit, timeout: 10)

        XCTAssertThrowsError(try coordinator.beginOperation())
        let wrongKind = CoordinatorRequest(
            checkoutID: request.checkoutID,
            operationID: request.operationID,
            requestID: request.requestID,
            kind: .sessionBeforeSubmit
        )
        XCTAssertFalse(coordinator.resolve(wrongKind))
        XCTAssertTrue(coordinator.resolve(request))
        XCTAssertFalse(coordinator.resolve(request))

        XCTAssertEqual(fixture.events.events.compactMap { event -> CoordinatorEvent? in
            if case .operationBusy = event { return event }
            return nil
        }.count, 1)
    }

    func test_timeoutAndInvalidationCancelRequestsAndReleaseEveryOwnedResource() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        _ = try await coordinator.setup()
        let operationID = try coordinator.beginOperation()
        let request = try coordinator.beginRequest(operationID: operationID, kind: .advancedSubmit, timeout: 10)

        fixture.scheduler.fireLast()
        XCTAssertFalse(coordinator.resolve(request))
        coordinator.invalidate()
        coordinator.invalidate()

        XCTAssertEqual(fixture.presenter.disposeCount, 1)
        XCTAssertEqual(fixture.factory.checkouts[0].disposeCount, 1)
        XCTAssertEqual(fixture.host.releaseCount, 1)
        XCTAssertTrue(fixture.scheduler.cancellations.allSatisfy(\.cancelled))
    }

    func test_requestBrokerRequiresEveryIdentityAndSettlesEachRequestOnce() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        _ = try await coordinator.setup()
        let operationID = try coordinator.beginOperation()
        var cancelled = 0
        let submit = try coordinator.beginRequest(
            operationID: operationID,
            kind: .advancedSubmit,
            timeout: 10,
            cancellationFallback: { cancelled += 1 }
        )
        let details = try coordinator.beginRequest(
            operationID: operationID,
            kind: .advancedAdditionalDetails,
            timeout: 10,
            cancellationFallback: { cancelled += 1 }
        )

        XCTAssertEqual(coordinator.pendingRequestCount, 2)
        XCTAssertFalse(coordinator.resolve(.init(
            checkoutID: submit.checkoutID,
            operationID: submit.operationID,
            requestID: details.requestID,
            kind: submit.kind
        )))
        XCTAssertTrue(coordinator.resolve(submit))
        coordinator.invalidate()
        coordinator.invalidate()

        XCTAssertEqual(cancelled, 1)
        XCTAssertEqual(coordinator.pendingRequestCount, 0)
    }

    func test_terminalCleanupDoesNotRequireAnEventListener() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator(eventSink: DiscardingEventSink())
        _ = try await coordinator.setup()
        let operationID = try coordinator.beginOperation()
        var cancellations = 0
        _ = try coordinator.beginRequest(
            operationID: operationID,
            kind: .advancedSubmit,
            timeout: 10,
            cancellationFallback: { cancellations += 1 }
        )

        coordinator.invalidate()

        XCTAssertEqual(cancellations, 1)
        XCTAssertEqual(fixture.presenter.disposeCount, 1)
        XCTAssertEqual(fixture.factory.checkouts[0].disposeCount, 1)
        XCTAssertEqual(fixture.host.releaseCount, 1)
        XCTAssertEqual(coordinator.pendingRequestCount, 0)
    }

    func test_invalidationDuringSetupDisposesUncommittedCandidate() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let factoryStarted = expectation(description: "factory started")
        let allowFactoryToFinish = expectation(description: "factory may finish")
        fixture.factory.onCreate = {
            factoryStarted.fulfill()
            await self.fulfillment(of: [allowFactoryToFinish], timeout: 1)
        }

        let setup = Task { @MainActor in
            try await coordinator.setup()
        }
        await fulfillment(of: [factoryStarted], timeout: 1)
        coordinator.invalidate()
        allowFactoryToFinish.fulfill()

        do {
            _ = try await setup.value
            XCTFail("Expected a setup invalidated while its candidate was pending")
        } catch {
            XCTAssertEqual(fixture.factory.checkouts[0].disposeCount, 1)
            XCTAssertNil(coordinator.checkoutID)
        }
    }

    func test_staleCheckoutAndHostLossCannotTouchReplacement() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let oldCheckoutID = try await coordinator.setup()
        let replacementID = try await coordinator.setup()

        XCTAssertThrowsError(try coordinator.beginOperation(checkoutID: oldCheckoutID))
        XCTAssertThrowsError(try coordinator.invalidate(checkoutID: oldCheckoutID))
        XCTAssertEqual(coordinator.checkoutID, replacementID)

        coordinator.hostDidDisappear()

        XCTAssertNil(coordinator.checkoutID)
        XCTAssertEqual(fixture.factory.checkouts.map(\.disposeCount), [1, 1])
        XCTAssertEqual(fixture.host.releaseCount, 2)
    }

    @MainActor
    private final class Fixture {
        let ledger = Ledger()
        let factory: Factory
        let presenter = Presenter()
        let events = EventSink()
        let scheduler = Scheduler()
        let host = Host()
        let identities = Identities()

        init() {
            factory = Factory(ledger: ledger)
            host.ledger = ledger
        }

        var log: [String] { ledger.entries }

        func makeCoordinator(eventSink: CheckoutEventSink? = nil) -> CheckoutCoordinator {
            CheckoutCoordinator(
                dependencies: CheckoutCoordinatorDependencies(
                    checkoutFactory: factory,
                    presenterFactory: PresenterFactoryFake(presenter: presenter),
                    eventSink: eventSink ?? events,
                    identityGenerator: identities,
                    scheduler: scheduler,
                    hostAdapter: host
                )
            )
        }
    }

    @MainActor
    private final class Factory: CheckoutFactory {
        let ledger: Ledger
        var shouldFail = false
        var onCreate: (@MainActor () async -> Void)?
        private(set) var checkouts: [Checkout] = []

        init(ledger: Ledger) {
            self.ledger = ledger
        }

        func makeCheckout() async throws -> CoordinatorCheckout {
            await onCreate?()
            guard !shouldFail else {
                ledger.entries.append("create-failed")
                throw TestError.factory
            }
            let checkout = Checkout(ledger: ledger, number: checkouts.count + 1)
            checkouts.append(checkout)
            return checkout
        }
    }

    @MainActor
    private final class Checkout: CoordinatorCheckout {
        let ledger: Ledger
        let number: Int
        private(set) var disposeCount = 0

        init(ledger: Ledger, number: Int) {
            self.ledger = ledger
            self.number = number
            ledger.entries.append("create-\(number)")
        }

        var checkoutState: CheckoutState? {
            nil
        }

        func dispose() {
            disposeCount += 1
            ledger.entries.append("dispose-\(number)")
        }
    }

    @MainActor
    private final class PresenterFactoryFake: PresenterFactory {
        let presenter: Presenter

        init(presenter: Presenter) {
            self.presenter = presenter
        }

        func makePresenter() -> CoordinatorPresenter {
            presenter
        }
    }

    @MainActor
    private final class Presenter: CoordinatorPresenter {
        private(set) var disposeCount = 0

        func dispose() {
            disposeCount += 1
        }
    }

    @MainActor
    private final class EventSink: CheckoutEventSink {
        private(set) var events: [CoordinatorEvent] = []

        func emit(_ event: CoordinatorEvent) {
            events.append(event)
        }
    }

    @MainActor
    private final class DiscardingEventSink: CheckoutEventSink {
        func emit(_: CoordinatorEvent) {}
    }

    @MainActor
    private final class Identities: CheckoutIdentityGenerator {
        private var nextByKind: [CoordinatorIdentityKind: Int] = [:]

        func nextID(for kind: CoordinatorIdentityKind) -> String {
            let next = (nextByKind[kind] ?? 0) + 1
            nextByKind[kind] = next
            switch kind {
            case .checkout: return "checkout-\(next)"
            case .operation: return "operation-\(next)"
            case .request: return "request-\(next)"
            }
        }
    }

    @MainActor
    private final class Scheduler: CheckoutScheduler {
        private(set) var cancellations: [Cancellation] = []
        private var actions: [() -> Void] = []

        func schedule(after _: TimeInterval, action: @escaping @MainActor () -> Void) -> CoordinatorCancellation {
            let cancellation = Cancellation()
            cancellations.append(cancellation)
            actions.append { [weak cancellation] in
                guard cancellation?.cancelled == false else { return }
                action()
            }
            return cancellation
        }

        func fireLast() {
            actions.last?()
        }
    }

    @MainActor
    private final class Cancellation: CoordinatorCancellation {
        private(set) var cancelled = false

        func cancel() {
            cancelled = true
        }
    }

    @MainActor
    private final class Host: CheckoutHostAdapter {
        var ledger: Ledger?
        private(set) var releaseCount = 0

        func releaseCheckoutHost() {
            releaseCount += 1
            ledger?.entries.append("host-release")
        }
    }

    @MainActor
    private final class Ledger {
        var entries: [String] = []
    }

    private enum TestError: Error {
        case factory
    }
}
