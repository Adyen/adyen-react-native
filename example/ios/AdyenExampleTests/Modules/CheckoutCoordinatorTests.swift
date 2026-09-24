//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

@testable import adyen_react_native
import Adyen
import AdyenCheckout
import UIKit
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

    func test_sessionAndAdvancedSetupFailuresKeepCandidatesPrivate() async throws {
        for stage in ["session-validation", "session-native", "advanced-validation", "advanced-native"] {
            let fixture = Fixture()
            let coordinator = fixture.makeCoordinator()
            fixture.factory.shouldFail = true

            do {
                _ = try await coordinator.setup()
                XCTFail("\(stage) must reject setup")
            } catch {
                XCTAssertNil(coordinator.checkoutID, "\(stage) must not publish a checkout")
                XCTAssertTrue(fixture.factory.checkouts.isEmpty, "\(stage) must not retain a candidate")
            }
        }
    }

    func test_failedBLeavesAStaleAndCAsTheOnlyEventProducingCheckout() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let checkoutA = try await coordinator.setup()
        let operationA = try coordinator.beginOperation()
        let requestA = try coordinator.beginRequest(operationID: operationA, kind: .advancedSubmit, timeout: 10)
        fixture.factory.shouldFail = true

        do {
            _ = try await coordinator.setup()
            XCTFail("Expected B to fail")
        } catch {
            XCTAssertNil(coordinator.checkoutID)
            XCTAssertFalse(coordinator.resolve(requestA))
        }

        fixture.factory.shouldFail = false
        let checkoutC = try await coordinator.setup()

        XCTAssertNotEqual(checkoutA, checkoutC)
        XCTAssertEqual(
            fixture.events.events.compactMap { event -> String? in
                guard case let .activated(checkoutID) = event else { return nil }
                return checkoutID
            },
            [checkoutA, checkoutC]
        )
        XCTAssertEqual(fixture.factory.checkouts.map(\.disposeCount), [1, 0])
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
            if case .operationBusy = event {
                return event
            }
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
        await coordinator.invalidate()
        await coordinator.invalidate()

        XCTAssertEqual(fixture.presenter.disposeCount, 1)
        XCTAssertEqual(fixture.factory.checkouts[0].disposeCount, 1)
        XCTAssertEqual(fixture.host.releaseCount, 1)
        XCTAssertTrue(fixture.scheduler.cancellations.allSatisfy(\.cancelled))
    }

    func test_lastPresenterUnmountCancelsItsAddressLookupRequestOnce() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let checkoutID = try await coordinator.setup()
        let presenter = PassivePresenter()
        try coordinator.registerPassivePresenter(
            checkoutID: checkoutID,
            presenterID: "card",
            target: .paymentMethod(try XCTUnwrap(PaymentMethodType(rawValue: "scheme"))),
            presenter: presenter
        )
        let operationID = try coordinator.acquireAddressLookupOperation(checkoutID: checkoutID)
        var cancellations = 0
        let request = try coordinator.beginRequest(
            operationID: operationID,
            kind: .addressLookupSearch,
            timeout: 10,
            cancellationFallback: { cancellations += 1 }
        )

        coordinator.unregisterPassivePresenter(
            checkoutID: checkoutID,
            presenterID: "card",
            presenter: presenter
        )

        XCTAssertEqual(cancellations, 1)
        XCTAssertEqual(coordinator.pendingRequestCount, 0)
        XCTAssertNil(coordinator.operationID)
        XCTAssertFalse(coordinator.resolve(request))
    }

    func test_addressLookupReusesItsDedicatedOperationAcrossSearchesAndSelection() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let checkoutID = try await coordinator.setup()
        var cancelledSearches = 0

        let lookupOperation = try coordinator.acquireAddressLookupOperation(checkoutID: checkoutID)
        let initialSearch = try coordinator.beginRequest(
            operationID: lookupOperation,
            kind: .addressLookupSearch,
            timeout: 10,
            cancellationFallback: { cancelledSearches += 1 }
        )
        XCTAssertTrue(coordinator.cancel(initialSearch))

        let repeatedLookupOperation = try coordinator.acquireAddressLookupOperation(checkoutID: checkoutID)
        let replacementSearch = try coordinator.beginRequest(
            operationID: repeatedLookupOperation,
            kind: .addressLookupSearch,
            timeout: 10
        )
        let selection = try coordinator.beginRequest(
            operationID: repeatedLookupOperation,
            kind: .addressLookupSelection,
            timeout: 10
        )

        XCTAssertEqual(lookupOperation, repeatedLookupOperation)
        XCTAssertEqual(initialSearch.operationID, replacementSearch.operationID)
        XCTAssertEqual(replacementSearch.operationID, selection.operationID)
        XCTAssertEqual(cancelledSearches, 1)
        XCTAssertFalse(coordinator.resolve(initialSearch))
        XCTAssertTrue(coordinator.resolve(replacementSearch))
        XCTAssertTrue(coordinator.resolve(selection))

        coordinator.completeAddressLookupOperation(repeatedLookupOperation)

        XCTAssertNil(coordinator.operationID)
        switch coordinator.acquireInitialEmbeddedOperation(checkoutID: checkoutID) {
        case let .acquired(operationID):
            XCTAssertNotEqual(operationID, lookupOperation)
        case .explicit, .competing:
            XCTFail("A completed lookup must leave the embedded slot available for before-submit")
        }
    }

    func test_addressLookupNeverAdoptsAnExplicitOperation() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let checkoutID = try await coordinator.setup()
        let explicitOperation = try coordinator.beginOperation(checkoutID: checkoutID)

        XCTAssertThrowsError(try coordinator.acquireAddressLookupOperation(checkoutID: checkoutID)) { error in
            guard case CoordinatorError.operationBusy = error else {
                return XCTFail("Expected an explicit operation to reject lookup ownership")
            }
        }
        XCTAssertEqual(coordinator.operationID, explicitOperation)
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
        await coordinator.invalidate()
        await coordinator.invalidate()

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

        await coordinator.invalidate()

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
        await coordinator.invalidate()
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
        do {
            try await coordinator.invalidate(checkoutID: oldCheckoutID)
            XCTFail("Expected stale checkout invalidation to fail")
        } catch {
            // Expected.
        }
        XCTAssertEqual(coordinator.checkoutID, replacementID)

        await coordinator.hostDidDisappear()

        XCTAssertNil(coordinator.checkoutID)
        XCTAssertEqual(fixture.factory.checkouts.map(\.disposeCount), [1, 1])
        XCTAssertEqual(fixture.host.releaseCount, 2)
    }

    func test_staleQuerySubmitResponseAndEventCannotTouchCurrentCheckout() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let checkoutA = try await coordinator.setup()
        let operationA = try coordinator.beginOperation()
        let requestA = try coordinator.beginRequest(operationID: operationA, kind: .advancedSubmit, timeout: 10)
        let checkoutB = try await coordinator.setup()

        XCTAssertFalse(coordinator.isActive(checkoutID: checkoutA))
        XCTAssertFalse(coordinator.resolve(requestA))
        XCTAssertEqual(coordinator.checkoutID, checkoutB)
        XCTAssertNil(coordinator.operationID)
        XCTAssertEqual(
            fixture.events.events.compactMap { event -> CoordinatorRequest? in
                guard case let .staleRequest(request) = event else { return nil }
                return request
            },
            [requestA]
        )
    }

    func test_distinctCanonicalPassivePresentersRemainIndependentUntilTheirOwnUnmount() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let checkoutID = try await coordinator.setup()
        let first = PassivePresenter()
        let second = PassivePresenter()

        try coordinator.registerPassivePresenter(
            checkoutID: checkoutID,
            presenterID: "card-first",
            target: .paymentMethod(try XCTUnwrap(PaymentMethodType(rawValue: "scheme"))),
            presenter: first
        )
        try coordinator.registerPassivePresenter(
            checkoutID: checkoutID,
            presenterID: "card-second",
            target: .storedPaymentMethod("stored-card"),
            presenter: second
        )

        XCTAssertEqual(coordinator.passivePresenterCount, 2)
        XCTAssertNil(coordinator.operationID)

        coordinator.unregisterPassivePresenter(
            checkoutID: checkoutID,
            presenterID: "card-first",
            presenter: first
        )

        XCTAssertEqual(coordinator.passivePresenterCount, 1)
        XCTAssertEqual(first.disposeCount, 0)
        XCTAssertEqual(second.disposeCount, 0)

        await coordinator.invalidate()

        XCTAssertEqual(first.disposeCount, 0)
        XCTAssertEqual(second.disposeCount, 1)
    }

    func test_duplicateCanonicalTargetsAreRejectedWithoutReplacingTheOriginalPresenter() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let checkoutID = try await coordinator.setup()
        let original = PassivePresenter()
        let duplicate = PassivePresenter()
        let target = TurboCheckoutTarget.paymentMethod(try XCTUnwrap(PaymentMethodType(rawValue: "scheme")))

        try coordinator.registerPassivePresenter(
            checkoutID: checkoutID,
            presenterID: "card-original",
            target: target,
            presenter: original
        )

        XCTAssertThrowsError(
            try coordinator.registerPassivePresenter(
                checkoutID: checkoutID,
                presenterID: "card-duplicate",
                target: target,
                presenter: duplicate
            )
        )
        XCTAssertEqual(coordinator.passivePresenterCount, 1)
        XCTAssertEqual(original.disposeCount, 0)
        XCTAssertEqual(duplicate.disposeCount, 0)
    }

    func test_embeddedOperationAcquisitionIsAnonymousAndRetryReleasesOnlyEmbeddedOwnership() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let checkoutID = try await coordinator.setup()

        let operationID = try XCTUnwrap(coordinator.acquireEmbeddedOperation(checkoutID: checkoutID))
        XCTAssertEqual(coordinator.operationID, operationID)
        XCTAssertEqual(fixture.presenterFactory.createCount, 0)
        XCTAssertNil(coordinator.acquireEmbeddedOperation(checkoutID: checkoutID))

        coordinator.releaseEmbeddedOperation(operationID)

        XCTAssertNil(coordinator.operationID)
        XCTAssertNotNil(coordinator.acquireEmbeddedOperation(checkoutID: checkoutID))
    }

    func test_replacementInvalidatesMountedPresenterWithoutAllowingOldCheckoutToReregister() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let oldCheckoutID = try await coordinator.setup()
        let oldPresenter = PassivePresenter()
        try coordinator.registerPassivePresenter(
            checkoutID: oldCheckoutID,
            presenterID: "card",
            target: .paymentMethod(try XCTUnwrap(PaymentMethodType(rawValue: "scheme"))),
            presenter: oldPresenter
        )

        let replacementID = try await coordinator.setup()
        XCTAssertEqual(oldPresenter.disposeCount, 1)
        XCTAssertEqual(coordinator.passivePresenterCount, 0)

        XCTAssertThrowsError(
            try coordinator.registerPassivePresenter(
                checkoutID: oldCheckoutID,
                presenterID: "card",
                target: .paymentMethod(try XCTUnwrap(PaymentMethodType(rawValue: "scheme"))),
                presenter: oldPresenter
            )
        )
        XCTAssertEqual(coordinator.checkoutID, replacementID)
        XCTAssertEqual(coordinator.passivePresenterCount, 0)
    }

    func test_invalidationWaitsForCoordinatorOwnedHostDismissal() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let checkoutID = try await coordinator.setup()
        let dismissalStarted = expectation(description: "dismissal started")
        let allowDismissal = expectation(description: "allow dismissal")
        fixture.host.onRelease = {
            dismissalStarted.fulfill()
            await self.fulfillment(of: [allowDismissal], timeout: 1)
        }

        let firstInvalidation = Task { @MainActor in
            try await coordinator.invalidate(checkoutID: checkoutID)
        }
        await fulfillment(of: [dismissalStarted], timeout: 1)
        let secondInvalidation = Task { @MainActor in
            try await coordinator.invalidate(checkoutID: checkoutID)
        }
        XCTAssertFalse(firstInvalidation.isCancelled)
        XCTAssertFalse(secondInvalidation.isCancelled)
        allowDismissal.fulfill()
        try await firstInvalidation.value
        try await secondInvalidation.value
        XCTAssertEqual(fixture.host.releaseCount, 1)
    }

    func test_replacementWaitsForOwnedDismissalBeforeCreatingOrPublishing() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        _ = try await coordinator.setup()
        let dismissalStarted = expectation(description: "dismissal started")
        let allowDismissal = expectation(description: "allow dismissal")
        fixture.host.onRelease = {
            dismissalStarted.fulfill()
            await self.fulfillment(of: [allowDismissal], timeout: 1)
        }

        let replacement = Task { @MainActor in
            try await coordinator.setup()
        }
        await fulfillment(of: [dismissalStarted], timeout: 1)
        XCTAssertEqual(fixture.log, ["create-1", "dispose-1", "host-release"])
        XCTAssertNil(coordinator.checkoutID)

        allowDismissal.fulfill()
        let replacementID = try await replacement.value
        XCTAssertEqual(replacementID, "checkout-2")
        XCTAssertEqual(fixture.log, ["create-1", "dispose-1", "host-release", "create-2"])
    }

    func test_staleModuleHostTeardownCannotInvalidateReplacement() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        _ = try await coordinator.setup(ownerID: "module-a") {
            try await fixture.factory.makeCheckout()
        }
        let replacementID = try await coordinator.setup(ownerID: "module-b") {
            try await fixture.factory.makeCheckout()
        }

        await coordinator.hostDidDisappear(ownerID: "module-a")

        XCTAssertEqual(coordinator.checkoutID, replacementID)
        XCTAssertEqual(fixture.factory.checkouts.map(\.disposeCount), [1, 0])
        await coordinator.hostDidDisappear(ownerID: "module-b")
        await coordinator.hostDidDisappear(ownerID: "module-b")
        XCTAssertEqual(fixture.factory.checkouts.map(\.disposeCount), [1, 1])
        XCTAssertEqual(fixture.host.releaseCount, 2)
    }

    func test_generatedTargetParserPreservesRegularTypeAndExactStoredIdentity() throws {
        switch try resolveCheckoutTarget(["kind": "paymentMethod", "type": "scheme"]) {
        case let .paymentMethod(type):
            XCTAssertEqual(type.rawValue, "scheme")
        case .storedPaymentMethod:
            XCTFail("Expected a regular payment method target")
        }
        switch try resolveCheckoutTarget(["kind": "storedPaymentMethod", "id": "stored-second"]) {
        case .paymentMethod:
            XCTFail("Expected a stored payment method target")
        case let .storedPaymentMethod(id):
            XCTAssertEqual(id, "stored-second")
        }
        XCTAssertThrowsError(try resolveCheckoutTarget(["kind": "storedPaymentMethod", "id": ""]))
        XCTAssertThrowsError(try resolveCheckoutTarget(["kind": "unknown", "type": "scheme"]))
    }

    func test_sameTypeStoredIDsRetainExactNativeQueryAndSubmitOutcomes() throws {
        let availableStoredIDs: Set<String> = ["stored-first", "stored-second"]
        let scheme = try XCTUnwrap(PaymentMethodType(rawValue: "scheme"))
        let first = try resolveCheckoutTarget(["kind": "storedPaymentMethod", "id": "stored-first"])
        let second = try resolveCheckoutTarget(["kind": "storedPaymentMethod", "id": "stored-second"])
        var submitted: [TurboCheckoutTarget] = []

        XCTAssertTrue(isNativeTargetAvailable(first, paymentMethodTypes: [scheme], storedIDs: availableStoredIDs))
        XCTAssertTrue(isNativeTargetAvailable(second, paymentMethodTypes: [scheme], storedIDs: availableStoredIDs))
        submitNativeTarget(first, submitted: &submitted)
        submitNativeTarget(second, submitted: &submitted)

        XCTAssertEqual(submitted, [first, second])
        XCTAssertFalse(isNativeTargetAvailable(.storedPaymentMethod("missing"), paymentMethodTypes: [scheme], storedIDs: availableStoredIDs))
    }

    func test_everySupportedRequestKindRequiresItsExactCorrelationTuple() async throws {
        let kinds: [CoordinatorRequestKind] = [
            .advancedSubmit,
            .advancedAdditionalDetails,
            .sessionBeforeSubmit,
            .addressLookupSearch,
            .addressLookupSelection,
            .applePayAuthorization,
            .applePayShippingContact,
            .applePayShippingMethod,
            .applePayCouponCode
        ]

        for kind in kinds {
            let fixture = Fixture()
            let coordinator = fixture.makeCoordinator()
            _ = try await coordinator.setup()
            let operationID = try coordinator.beginOperation()
            let request = try coordinator.beginRequest(operationID: operationID, kind: kind, timeout: 10)

            XCTAssertFalse(coordinator.resolve(.init(
                checkoutID: "other-checkout",
                operationID: request.operationID,
                requestID: request.requestID,
                kind: request.kind
            )))
            XCTAssertFalse(coordinator.resolve(.init(
                checkoutID: request.checkoutID,
                operationID: "other-operation",
                requestID: request.requestID,
                kind: request.kind
            )))
            XCTAssertFalse(coordinator.resolve(.init(
                checkoutID: request.checkoutID,
                operationID: request.operationID,
                requestID: "other-request",
                kind: request.kind
            )))
            XCTAssertFalse(coordinator.resolve(.init(
                checkoutID: request.checkoutID,
                operationID: request.operationID,
                requestID: request.requestID,
                kind: kind == .advancedSubmit ? .sessionBeforeSubmit : .advancedSubmit
            )))
            XCTAssertTrue(coordinator.resolve(request))
            XCTAssertFalse(coordinator.resolve(request))
        }
    }

    func test_everyPaymentSurfaceContenderIsRejectedWithoutAllocationOrQueueing() async throws {
        let surfaces = ["embedded", "headless", "drop-in"]

        for owner in surfaces {
            for contender in surfaces {
                let fixture = Fixture()
                let coordinator = fixture.makeCoordinator()
                _ = try await coordinator.setup()
                let operationID = try coordinator.beginOperation()

                XCTAssertThrowsError(try coordinator.beginOperation(), "\(owner) should retain the slot against \(contender)")
                XCTAssertEqual(fixture.presenterFactory.createCount, 1)
                XCTAssertEqual(coordinator.operationID, operationID)

                coordinator.completeOperation(operationID)
                _ = try coordinator.beginOperation()
                XCTAssertEqual(fixture.presenterFactory.createCount, 2)
            }
        }
    }

    func test_callbackFailureCausesSettleEverySupportedRequestExactlyOnce() async throws {
        let kinds: [CoordinatorRequestKind] = [
            .advancedSubmit,
            .advancedAdditionalDetails,
            .sessionBeforeSubmit,
            .addressLookupSearch,
            .addressLookupSelection,
            .applePayAuthorization,
            .applePayShippingContact,
            .applePayShippingMethod,
            .applePayCouponCode
        ]
        let causes: [(String, @MainActor (CheckoutCoordinator, Fixture) async throws -> Void)] = [
            ("timeout", { _, fixture in fixture.scheduler.fireLast() }),
            ("operation completion", { coordinator, _ in
                coordinator.completeOperation(coordinator.operationID!)
            }),
            ("replacement", { coordinator, _ in
                _ = try await coordinator.setup()
            }),
            ("invalidation", { coordinator, _ in
                await coordinator.invalidate()
            }),
            ("host loss", { coordinator, _ in
                await coordinator.hostDidDisappear()
            })
        ]

        for (cause, trigger) in causes {
            for kind in kinds {
                let fixture = Fixture()
                let coordinator = fixture.makeCoordinator()
                _ = try await coordinator.setup()
                var fallbackCount = 0
                let request = try coordinator.beginRequest(
                    operationID: try coordinator.beginOperation(),
                    kind: kind,
                    timeout: 10,
                    cancellationFallback: { fallbackCount += 1 }
                )

                try await trigger(coordinator, fixture)

                XCTAssertEqual(fallbackCount, 1, "\(cause) must settle \(kind) once")
                XCTAssertFalse(coordinator.resolve(request))
            }
        }
    }

    func test_cseValidationIsStatelessAndDoesNotMutateCheckoutOperationOwnership() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        _ = try await coordinator.setup()
        let operationID = try coordinator.beginOperation()
        let actionGate = ActionOperationGate()
        let cse = CSETurboModuleAdapter()
        var cardNumber: Any?
        var expiry: Any?
        var securityCode: Any?

        XCTAssertTrue(actionGate.activate(1))
        cse.validateCardNumber("4111111111111111", enableLuhnCheck: true) { cardNumber = $0 }
        cse.validateCardExpiryMonth("03", year: "2030") { expiry = $0 }
        cse.validateCardSecurityCode("737", brand: "visa") { securityCode = $0 }

        XCTAssertEqual(cardNumber as? Bool, true)
        XCTAssertEqual(expiry as? Bool, true)
        XCTAssertEqual(securityCode as? Bool, true)
        XCTAssertEqual(coordinator.operationID, operationID)
        await coordinator.invalidate()
        XCTAssertTrue(actionGate.isActive(1))
        XCTAssertNil(coordinator.operationID)
    }

    func test_cseEncryptionFailuresSettleIndependentlyAlongsideAllValidationMethods() {
        let cse = CSETurboModuleAdapter()
        var rejectedCodes: [String] = []

        cse.encryptCard(
            [:],
            publicKey: "not-a-public-key",
            resolver: { _ in XCTFail("Malformed card must not encrypt") },
            rejecter: { code, _, _ in rejectedCodes.append(code ?? "") }
        )
        cse.encryptBin(
            "not-a-bin",
            publicKey: "not-a-public-key",
            resolver: { _ in XCTFail("Malformed BIN must not encrypt") },
            rejecter: { code, _, _ in rejectedCodes.append(code ?? "") }
        )

        XCTAssertEqual(rejectedCodes, ["Encryption failed", "Encryption failed"])
    }

    func test_latePostTerminalInvalidationReleasesCurrentResourceLedgerOnce() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        _ = try await coordinator.setup()
        let operation = try coordinator.beginOperation()
        let request = try coordinator.beginRequest(operationID: operation, kind: .advancedSubmit, timeout: 10)
        coordinator.completeOperation(operation)
        await coordinator.invalidate()
        await coordinator.invalidate()

        XCTAssertFalse(coordinator.resolve(request))
        XCTAssertEqual(fixture.presenter.disposeCount, 1)
        XCTAssertEqual(fixture.factory.checkouts.first?.disposeCount, 1)
        XCTAssertEqual(fixture.host.releaseCount, 1)
        XCTAssertNil(coordinator.checkoutID)
    }

    func test_representativeSessionAndAdvancedHeadlessTargetsHaveCoordinatorOwnedIdentities() async throws {
        let scheme = try XCTUnwrap(PaymentMethodType(rawValue: "scheme"))
        let targets: [(String, TurboCheckoutTarget)] = [
            ("sessions", .paymentMethod(scheme)),
            ("advanced", .storedPaymentMethod("stored-second"))
        ]

        for (_, target) in targets {
            let fixture = Fixture()
            let coordinator = fixture.makeCoordinator()
            _ = try await coordinator.setup()
            let operation = try coordinator.beginOperation()

            XCTAssertTrue(isNativeTargetAvailable(target, paymentMethodTypes: [scheme], storedIDs: ["stored-second"]))
            XCTAssertEqual(coordinator.operationID, operation)
            coordinator.completeOperation(operation)
            XCTAssertEqual(fixture.presenter.disposeCount, 1)
        }
    }

    @MainActor
    private final class Fixture {
        let ledger = Ledger()
        let factory: Factory
        let presenter = Presenter()
        let presenterFactory: PresenterFactoryFake
        let events = EventSink()
        let scheduler = Scheduler()
        let host = Host()
        let identities = Identities()

        init() {
            factory = Factory(ledger: ledger)
            presenterFactory = PresenterFactoryFake(presenter: presenter)
            host.ledger = ledger
        }

        var log: [String] {
            ledger.entries
        }

        func makeCoordinator(eventSink: CheckoutEventSink? = nil) -> CheckoutCoordinator {
            CheckoutCoordinator(
                dependencies: CheckoutCoordinatorDependencies(
                    checkoutFactory: factory,
                    presenterFactory: presenterFactory,
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
        private(set) var createCount = 0

        init(presenter: Presenter) {
            self.presenter = presenter
        }

        func makePresenter() -> CoordinatorPresenter {
            createCount += 1
            return presenter
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
    private final class PassivePresenter: CoordinatorPresenter {
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
        var onRelease: (@MainActor () async -> Void)?
        private(set) var releaseCount = 0

        func releaseCheckoutHost() async {
            releaseCount += 1
            ledger?.entries.append("host-release")
            await onRelease?()
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

@MainActor
private func isNativeTargetAvailable(
    _ target: TurboCheckoutTarget,
    paymentMethodTypes: Set<PaymentMethodType>,
    storedIDs: Set<String>
) -> Bool {
    switch target {
    case let .paymentMethod(type):
        paymentMethodTypes.contains(type)
    case let .storedPaymentMethod(id):
        storedIDs.contains(id)
    }
}

@MainActor
private func submitNativeTarget(_ target: TurboCheckoutTarget, submitted: inout [TurboCheckoutTarget]) {
    submitted.append(target)
}

@MainActor
final class ActionOperationGateTests: XCTestCase {

    func testDelayedCallbackCannotBecomeActiveForReplacementOperation() {
        let gate = ActionOperationGate()

        XCTAssertTrue(gate.activate(1))
        XCTAssertTrue(gate.beginCleanup(1))
        XCTAssertFalse(gate.isActive(1))
        XCTAssertFalse(gate.activate(2))

        XCTAssertTrue(gate.completeCleanup(1))
        XCTAssertTrue(gate.activate(2))
        XCTAssertFalse(gate.isActive(1))
        XCTAssertTrue(gate.isActive(2))
    }

    func testOnlyTheExactOperationCanCompleteCleanup() {
        let gate = ActionOperationGate()

        XCTAssertTrue(gate.activate(1))
        XCTAssertTrue(gate.beginCleanup(1))
        XCTAssertFalse(gate.completeCleanup(2))
        XCTAssertFalse(gate.activate(2))
        XCTAssertTrue(gate.completeCleanup(1))
    }

    func testStaleCallbackCannotSettleReplacementActionPromise() {
        let gate = ActionOperationGate()
        let first = ActionPromiseRecorder()
        let second = ActionPromiseRecorder()

        XCTAssertTrue(gate.activate(1))
        XCTAssertTrue(gate.beginCleanup(1))
        XCTAssertTrue(gate.completeCleanup(1))
        XCTAssertTrue(gate.activate(2))

        first.resolveIfActive(gate: gate, operationID: 1)
        second.resolveIfActive(gate: gate, operationID: 2)

        XCTAssertEqual(first.resolutionCount, 0)
        XCTAssertEqual(second.resolutionCount, 1)
    }
}

@MainActor
private final class ActionPromiseRecorder {
    private(set) var resolutionCount = 0

    func resolveIfActive(gate: ActionOperationGate, operationID: Int) {
        guard gate.isActive(operationID) else { return }
        resolutionCount += 1
    }
}

@MainActor
final class ActionPresentationDelegateTests: XCTestCase {

    func testDelayedDelegateFromCleanedOperationCannotPresentReplacement() {
        let host = PresentationHost()
        let router = ActionPresentationRouter(host: host)
        let oldOperation = makeOperation(id: 1)
        let oldDelegate = router.delegate(for: oldOperation) { _ in }
        router.activate(oldOperation)
        router.deactivate(oldOperation)

        let replacementOperation = makeOperation(id: 2)
        let replacementDelegate = router.delegate(for: replacementOperation) { _ in }
        router.activate(replacementOperation)

        oldDelegate.present(viewController: UIViewController())
        replacementDelegate.present(viewController: UIViewController())

        XCTAssertEqual(host.presentedControllers.count, 1)
        XCTAssertTrue(host.presentedControllers[0] === replacementOperation.presentedController)
    }

    func testHostLossOnlyCancelsTheDelegateBoundOperation() {
        let host = PresentationHost()
        host.presenter = nil
        let router = ActionPresentationRouter(host: host)
        let oldOperation = makeOperation(id: 1)
        var oldHostLosses = 0
        let oldDelegate = router.delegate(for: oldOperation) { _ in
            oldHostLosses += 1
        }
        router.activate(oldOperation)
        router.deactivate(oldOperation)

        let replacementOperation = makeOperation(id: 2)
        var replacementHostLosses = 0
        let replacementDelegate = router.delegate(for: replacementOperation) { _ in
            replacementHostLosses += 1
        }
        router.activate(replacementOperation)

        oldDelegate.present(viewController: UIViewController())
        replacementDelegate.present(viewController: UIViewController())

        XCTAssertEqual(oldHostLosses, 0)
        XCTAssertEqual(replacementHostLosses, 1)
    }

    private func makeOperation(id: Int) -> ActiveAction {
        ActiveAction(id: id, resolver: { _ in }, rejecter: { _, _, _ in })
    }

    private final class PresentationHost: ActionPresentationHost {
        var presenter: UIViewController? = UIViewController()
        private(set) var presentedControllers: [UIViewController] = []

        func topPresenter() -> UIViewController? {
            presenter
        }

        func present(_ controller: UIViewController, from _: UIViewController) {
            presentedControllers.append(controller)
        }
    }
}
