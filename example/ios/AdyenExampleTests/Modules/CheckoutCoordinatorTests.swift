//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
@testable import adyen_react_native
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

    func test_dropInAvailabilityChecksBusyAndStaleWithoutAllocatingAnOperationOrRequest() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let checkoutID = try await coordinator.setup()

        XCTAssertNoThrow(try coordinator.assertDropInAvailability(checkoutID: checkoutID))
        XCTAssertNil(coordinator.operationID)
        XCTAssertEqual(coordinator.pendingRequestCount, 0)

        let activeOperationID = try coordinator.beginOperation(checkoutID: checkoutID)

        XCTAssertThrowsError(try coordinator.assertDropInAvailability(checkoutID: checkoutID)) { error in
            XCTAssertEqual(error as? CoordinatorError, .operationBusy)
        }
        XCTAssertEqual(coordinator.operationID, activeOperationID)
        XCTAssertEqual(coordinator.pendingRequestCount, 0)

        try await coordinator.invalidate(checkoutID: checkoutID)

        XCTAssertThrowsError(try coordinator.assertDropInAvailability(checkoutID: checkoutID)) { error in
            XCTAssertEqual(error as? CoordinatorError, .staleCheckout)
        }
        XCTAssertEqual(coordinator.pendingRequestCount, 0)
    }

    func test_dropInUnsupportedCapabilityRejectsAsynchronouslyWithoutEmittingAnEvent() async {
        var checkedCheckoutIDs: [String] = []
        let adapter = CheckoutTurboModuleAdapter { checkoutID in
            checkedCheckoutIDs.append(checkoutID)
        }
        var events: [NSDictionary] = []
        adapter.setEventSink { event in
            events.append(event)
        }
        let rejected = expectation(description: "unsupported Drop-in rejection")
        var rejectionCode: String?
        var resolved = false

        adapter.startDropIn(
            "checkout-id",
            resolver: { _ in resolved = true },
            rejecter: { code, _, _ in
                rejectionCode = code
                rejected.fulfill()
            }
        )

        XCTAssertNil(rejectionCode)
        await fulfillment(of: [rejected], timeout: 1)

        XCTAssertEqual(checkedCheckoutIDs, ["checkout-id"])
        XCTAssertEqual(rejectionCode, "unsupportedCapability")
        XCTAssertFalse(resolved)
        XCTAssertTrue(events.isEmpty)
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

    func test_competingEmbeddedCallbackReportsOneDebugAssertionAndDoesNotEmitMerchantRequest() async throws {
        let fixture = Fixture()
        var assertions: [String] = []
        let coordinator = fixture.makeCoordinator { assertions.append($0) }
        let checkoutID = try await coordinator.setup()

        guard case .acquired = coordinator.acquireInitialEmbeddedOperation(checkoutID: checkoutID) else {
            return XCTFail("The first embedded callback must acquire the operation")
        }
        guard case .competing = coordinator.acquireInitialEmbeddedOperation(checkoutID: checkoutID) else {
            return XCTFail("A competing embedded callback must use the native retry path")
        }

        XCTAssertEqual(assertions, ["Competing embedded checkout callback"])
        XCTAssertEqual(
            fixture.events.events.filter {
                if case .request = $0 {
                    return true
                }
                return false
            }.count,
            0
        )
    }

    func test_embeddedCallbackPathRetainsOwnershipUntilRetryOrTerminalCleanup() async throws {
        let fixture = Fixture()
        var assertions: [String] = []
        let coordinator = fixture.makeCoordinator { assertions.append($0) }
        let checkoutID = try await coordinator.setup()

        guard case let .acquired(firstOperation) = coordinator.acquireInitialEmbeddedOperation(checkoutID: checkoutID) else {
            return XCTFail("The first embedded callback must acquire anonymously")
        }
        XCTAssertEqual(fixture.presenterFactory.createCount, 0)
        guard case .competing = coordinator.acquireInitialEmbeddedOperation(checkoutID: checkoutID) else {
            return XCTFail("A competing initial callback must receive the native retry path")
        }
        XCTAssertEqual(assertions, ["Competing embedded checkout callback"])
        XCTAssertEqual(coordinator.pendingRequestCount, 0)

        XCTAssertThrowsError(try coordinator.beginOperation(checkoutID: checkoutID)) { error in
            XCTAssertEqual(error as? CoordinatorError, .operationBusy)
        }
        XCTAssertThrowsError(try coordinator.assertDropInAvailability(checkoutID: checkoutID)) { error in
            XCTAssertEqual(error as? CoordinatorError, .operationBusy)
        }

        let retryRequest = try coordinator.beginRequest(
            operationID: firstOperation,
            kind: .advancedSubmit,
            timeout: 10
        )
        XCTAssertTrue(coordinator.resolve(retryRequest))
        coordinator.releaseEmbeddedOperation(firstOperation)
        XCTAssertNil(coordinator.operationID)

        guard case let .acquired(actionOperation) = coordinator.acquireInitialEmbeddedOperation(checkoutID: checkoutID) else {
            return XCTFail("A retry must release the next embedded acquisition")
        }
        let actionRequest = try coordinator.beginRequest(
            operationID: actionOperation,
            kind: .advancedSubmit,
            timeout: 10
        )
        XCTAssertTrue(coordinator.resolve(actionRequest))
        XCTAssertEqual(coordinator.operationID, actionOperation)
        let detailsRequest = try coordinator.beginRequest(
            operationID: actionOperation,
            kind: .advancedAdditionalDetails,
            timeout: 10
        )
        XCTAssertTrue(coordinator.resolve(detailsRequest))
        XCTAssertEqual(coordinator.operationID, actionOperation)

        try await coordinator.invalidate(checkoutID: checkoutID)
        XCTAssertNil(coordinator.checkoutID)
        let freshCheckoutID = try await coordinator.setup()
        XCTAssertNotEqual(freshCheckoutID, checkoutID)
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
                    operationID: coordinator.beginOperation(),
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

    // MARK: - Payment method identity

    func test_catalogStampsUniqueIDsOnRegularMethodsAndKeepsStoredIdentity() throws {
        let paymentMethods = fixturePaymentMethods()
        let catalog = PaymentMethodCatalog(paymentMethods: paymentMethods)
        let other = PaymentMethodCatalog(paymentMethods: paymentMethods)

        XCTAssertEqual(catalog.regularIDs.count, 4)
        XCTAssertEqual(Set(catalog.regularIDs).count, 4)
        XCTAssertTrue(catalog.regularIDs.allSatisfy { !$0.isEmpty })
        XCTAssertTrue(Set(catalog.regularIDs).isDisjoint(with: other.regularIDs))
        XCTAssertEqual(catalog.storedIDs, ["stored-card"])

        let regularJSON = try XCTUnwrap(catalog.paymentMethodsJSON["paymentMethods"] as? [[String: Any]])
        XCTAssertEqual(regularJSON.compactMap { $0["id"] as? String }, catalog.regularIDs)
        XCTAssertEqual(regularJSON.compactMap { $0["brand"] as? String }, ["givex", "svs"])
        let storedJSON = try XCTUnwrap(catalog.paymentMethodsJSON["storedPaymentMethods"] as? [[String: Any]])
        XCTAssertEqual(storedJSON.compactMap { $0["id"] as? String }, ["stored-card"])

        let giftcard = try XCTUnwrap(PaymentMethodType(rawValue: "giftcard"))
        XCTAssertEqual(catalog.paymentMethod(for: catalog.regularIDs[2]), .regular(index: 2, type: giftcard, isFirstOfType: true))
        XCTAssertEqual(catalog.paymentMethod(for: catalog.regularIDs[3]), .regular(index: 3, type: giftcard, isFirstOfType: false))
        XCTAssertEqual(catalog.paymentMethod(for: "stored-card"), .stored(identifier: "stored-card"))
        XCTAssertNil(catalog.paymentMethod(for: "foreign"))
    }

    func test_catalogNeverPublishesDuplicateOrEmptyIDs() {
        var minted = ["", "same", "same", "same", "same"]
        let catalog = PaymentMethodCatalog(paymentMethods: fixturePaymentMethods()) {
            minted.isEmpty ? "" : minted.removeFirst()
        }

        XCTAssertEqual(Set(catalog.regularIDs).count, 4)
        XCTAssertFalse(catalog.regularIDs.contains(""))
        XCTAssertFalse(catalog.regularIDs.contains("stored-card"))
    }

    func test_adapterDescriptorPublishesTheActiveCheckoutsStampedPaymentMethods() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let adapter = makeAdapter(coordinator)
        let checkoutID = try await coordinator.setup()

        let descriptor = try adapter.descriptor(checkoutID: checkoutID, flow: "advanced")
        let json = try XCTUnwrap(descriptor["paymentMethodsJson"] as? String)
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any])
        let regular = try XCTUnwrap(object["paymentMethods"] as? [[String: Any]])

        XCTAssertEqual(descriptor["checkoutId"] as? String, checkoutID)
        XCTAssertEqual(descriptor["flow"] as? String, "advanced")
        XCTAssertEqual(regular.compactMap { $0["id"] as? String }, ["checkout1-pm-1", "checkout1-pm-2", "checkout1-pm-3", "checkout1-pm-4"])
        XCTAssertThrowsError(try adapter.descriptor(checkoutID: "stale", flow: "advanced"))
    }

    func test_unknownPaymentMethodIDRejectsInvalidTargetWithoutCreatingComponents() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let oldCheckoutID = try await coordinator.setup()
        let checkoutID = try await coordinator.setup()

        XCTAssertThrowsError(try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "foreign")) { error in
            XCTAssertEqual(error as? CoordinatorError, .invalidTarget)
        }
        XCTAssertThrowsError(try coordinator.isAvailable(checkoutID: checkoutID, paymentMethodID: "foreign")) { error in
            XCTAssertEqual(error as? CoordinatorError, .invalidTarget)
        }
        XCTAssertThrowsError(try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-1")) { error in
            XCTAssertEqual(error as? CoordinatorError, .invalidTarget, "ids of a replaced checkout are foreign")
        }
        XCTAssertThrowsError(try coordinator.createController(checkoutID: oldCheckoutID, paymentMethodID: "checkout2-pm-1")) { error in
            XCTAssertEqual(error as? CoordinatorError, .staleCheckout)
        }
        XCTAssertTrue(fixture.factory.checkouts.allSatisfy(\.createdComponents.isEmpty))
        XCTAssertEqual(coordinator.controllerCount, 0)

        let controller = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout2-pm-1")
        let created = try XCTUnwrap(fixture.factory.checkouts.last?.createdComponents.first)
        XCTAssertEqual(created.paymentMethod, try .regular(index: 0, type: XCTUnwrap(PaymentMethodType(rawValue: "scheme")), isFirstOfType: true))
        XCTAssertEqual(controller.paymentMethodID, "checkout2-pm-1")
    }

    // MARK: - Controller registry

    func test_createControllerEagerlyBuildsOneComponentPerPaymentMethodID() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let checkoutID = try await coordinator.setup()
        let checkout = try XCTUnwrap(fixture.factory.checkouts.last)

        let card = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-1")
        XCTAssertEqual(checkout.createdComponents.count, 1, "the component exists before any view mounts")
        XCTAssertTrue(card.requiresUserInteraction)
        XCTAssertTrue(card.viewController === checkout.createdComponents[0].component.viewController)

        let again = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-1")
        XCTAssertTrue(again === card)
        XCTAssertEqual(checkout.createdComponents.count, 1)

        let instant = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-2")
        let stored = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "stored-card")
        XCTAssertFalse(instant.requiresUserInteraction)
        XCTAssertNil(instant.viewController)
        XCTAssertTrue(stored.requiresUserInteraction)
        XCTAssertEqual(checkout.createdComponents.map(\.paymentMethod).last, .stored(identifier: "stored-card"))

        XCTAssertEqual(coordinator.controllerCount, 3)
        XCTAssertEqual(Set([card.controllerID, instant.controllerID, stored.controllerID]).count, 3)
        XCTAssertTrue(try coordinator.controller(checkoutID: checkoutID, controllerID: card.controllerID) === card)
        XCTAssertNil(coordinator.operationID, "creation never reserves the operation slot")
    }

    func test_isAvailableResolvesFalseForPresentButNonCreatablePaymentMethods() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let checkoutID = try await coordinator.setup()
        let checkout = try XCTUnwrap(fixture.factory.checkouts.last)

        XCTAssertFalse(try coordinator.isAvailable(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-3"))
        XCTAssertFalse(try coordinator.isAvailable(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-3"))
        XCTAssertThrowsError(try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-3")) { error in
            XCTAssertEqual(error as? CoordinatorError, .unsupportedPaymentMethod)
        }

        XCTAssertTrue(try coordinator.isAvailable(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-1"))
        let card = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-1")
        XCTAssertEqual(checkout.createdComponents.count, 1, "availability reuses the component it created")
        XCTAssertTrue(card.viewController === checkout.createdComponents[0].component.viewController)
        XCTAssertEqual(coordinator.controllerCount, 1)
    }

    func test_sameTypeInstancesGetDistinctControllers() async throws {
        let fixture = Fixture()
        fixture.factory.unsupportedTypes = []
        let coordinator = fixture.makeCoordinator()
        let checkoutID = try await coordinator.setup()
        let checkout = try XCTUnwrap(fixture.factory.checkouts.last)

        let first = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-3")
        let second = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-4")

        XCTAssertNotEqual(first.controllerID, second.controllerID)
        XCTAssertEqual(checkout.createdComponents.map(\.paymentMethod), [first.paymentMethod, second.paymentMethod])
        guard case .regular(index: 2, _, _) = first.paymentMethod,
              case .regular(index: 3, _, _) = second.paymentMethod else {
            return XCTFail("Each controller must resolve its exact instance")
        }
    }

    // MARK: - Fabric binding

    func test_viewEmbedsTheExistingComponentAndDetachesWithoutDisposing() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let checkoutID = try await coordinator.setup()
        let checkout = try XCTUnwrap(fixture.factory.checkouts.last)
        let controller = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-1")
        let child = try XCTUnwrap(controller.viewController)
        let host = UIViewController()
        let proxy = AdyenComponentViewProxy(frame: .zero, coordinator: coordinator)
        host.view.addSubview(proxy)

        proxy.updateBinding(checkoutID: checkoutID, controllerID: controller.controllerID)
        proxy.updateBinding(checkoutID: checkoutID, controllerID: controller.controllerID)

        XCTAssertEqual(checkout.createdComponents.count, 1, "mounting never creates a component")
        XCTAssertEqual(proxy.boundControllerID, controller.controllerID)
        XCTAssertTrue(child.parent === host)
        XCTAssertEqual(proxy.arrangedSubviews, [child.view])

        proxy.detach()
        proxy.detach()

        XCTAssertNil(child.parent)
        XCTAssertTrue(proxy.arrangedSubviews.isEmpty)
        XCTAssertFalse(controller.isDisposed)
        XCTAssertFalse(controller.isBound)
        XCTAssertEqual(coordinator.controllerCount, 1)

        let remounted = AdyenComponentViewProxy(frame: .zero, coordinator: coordinator)
        host.view.addSubview(remounted)
        remounted.updateBinding(checkoutID: checkoutID, controllerID: controller.controllerID)
        XCTAssertEqual(remounted.arrangedSubviews, [child.view])
        XCTAssertTrue(child.parent === host)
    }

    func test_secondLiveViewCannotBindTheSameControllerUntilTheFirstDetaches() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let checkoutID = try await coordinator.setup()
        let controller = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-1")
        let child = try XCTUnwrap(controller.viewController)
        let first = AdyenComponentViewProxy(frame: .zero, coordinator: coordinator)
        let second = AdyenComponentViewProxy(frame: .zero, coordinator: coordinator)

        first.updateBinding(checkoutID: checkoutID, controllerID: controller.controllerID)
        second.updateBinding(checkoutID: checkoutID, controllerID: controller.controllerID)

        XCTAssertNil(second.boundControllerID)
        XCTAssertTrue(second.arrangedSubviews.isEmpty)
        XCTAssertEqual(first.arrangedSubviews, [child.view])
        XCTAssertThrowsError(try controller.bind(RecordingBinding())) { error in
            XCTAssertEqual(error as? CoordinatorError, .controllerAlreadyBound)
        }

        second.detach()
        XCTAssertTrue(controller.isBound, "a rejected view cannot release another view's binding")

        first.detach()
        second.updateBinding(checkoutID: checkoutID, controllerID: controller.controllerID)
        XCTAssertEqual(second.boundControllerID, controller.controllerID)
        XCTAssertEqual(second.arrangedSubviews, [child.view])
    }

    func test_distinctControllersMountSimultaneouslyAndPropChangesRebind() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let checkoutID = try await coordinator.setup()
        let card = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-1")
        let stored = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "stored-card")
        let first = AdyenComponentViewProxy(frame: .zero, coordinator: coordinator)
        let second = AdyenComponentViewProxy(frame: .zero, coordinator: coordinator)

        first.updateBinding(checkoutID: checkoutID, controllerID: card.controllerID)
        second.updateBinding(checkoutID: checkoutID, controllerID: stored.controllerID)
        XCTAssertTrue(card.isBound)
        XCTAssertTrue(stored.isBound)

        second.updateBinding(checkoutID: checkoutID, controllerID: "unknown")
        XCTAssertFalse(stored.isBound)
        XCTAssertNil(second.boundControllerID)
        second.updateBinding(checkoutID: "stale", controllerID: stored.controllerID)
        XCTAssertNil(second.boundControllerID)
        second.updateBinding(checkoutID: nil, controllerID: nil)
        XCTAssertNil(second.boundControllerID)

        first.updateBinding(checkoutID: checkoutID, controllerID: stored.controllerID)
        XCTAssertFalse(card.isBound)
        XCTAssertEqual(first.arrangedSubviews, try [XCTUnwrap(stored.viewController).view])
        XCTAssertFalse(card.isDisposed)
        XCTAssertFalse(stored.isDisposed)
    }

    func test_controllerDisposalOnEveryTeardownPathIsExactlyOnceAndDetachesViews() async throws {
        let triggers: [(String, @MainActor (CheckoutCoordinator, String) async throws -> Void)] = [
            ("invalidate", { coordinator, checkoutID in try? await coordinator.invalidate(checkoutID: checkoutID) }),
            ("replacement", { coordinator, _ in _ = try await coordinator.setup() }),
            ("terminal", { coordinator, _ in await coordinator.invalidate() }),
            ("host loss", { coordinator, _ in await coordinator.hostDidDisappear() })
        ]

        for (name, trigger) in triggers {
            let fixture = Fixture()
            let coordinator = fixture.makeCoordinator()
            let checkoutID = try await coordinator.setup()
            let card = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-1")
            let stored = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "stored-card")
            let child = try XCTUnwrap(card.viewController)
            let proxy = AdyenComponentViewProxy(frame: .zero, coordinator: coordinator)
            proxy.updateBinding(checkoutID: checkoutID, controllerID: card.controllerID)
            let storedRecorder = RecordingBinding()
            try stored.bind(storedRecorder)

            try await trigger(coordinator, checkoutID)
            try await trigger(coordinator, checkoutID)

            XCTAssertTrue(card.isDisposed, name)
            XCTAssertTrue(stored.isDisposed, name)
            XCTAssertEqual(storedRecorder.disposals, 1, "\(name) must dispose each controller once")
            XCTAssertNil(proxy.boundControllerID, name)
            XCTAssertTrue(proxy.arrangedSubviews.isEmpty, name)
            XCTAssertNil(child.view.superview, name)
            XCTAssertThrowsError(try coordinator.controller(checkoutID: checkoutID, controllerID: card.controllerID), name) { error in
                XCTAssertEqual(error as? CoordinatorError, .staleCheckout)
            }
            proxy.updateBinding(checkoutID: checkoutID, controllerID: card.controllerID)
            XCTAssertNil(proxy.boundControllerID, "\(name) must not let a stale controller rebind")
        }
    }

    func test_replacementDisposesControllersBeforeCreatingTheNextCheckout() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let oldCheckoutID = try await coordinator.setup()
        let controller = try coordinator.createController(checkoutID: oldCheckoutID, paymentMethodID: "checkout1-pm-1")
        let recorder = RecordingBinding()
        recorder.ledger = fixture.ledger
        try controller.bind(recorder)

        let replacementID = try await coordinator.setup()

        XCTAssertEqual(fixture.log, ["create-1", "controller-disposed", "dispose-1", "host-release", "create-2"])
        XCTAssertEqual(coordinator.controllerCount, 0)
        XCTAssertThrowsError(try coordinator.submitController(checkoutID: oldCheckoutID, controllerID: controller.controllerID)) { error in
            XCTAssertEqual(error as? CoordinatorError, .staleCheckout)
        }
        XCTAssertThrowsError(try coordinator.createController(checkoutID: oldCheckoutID, paymentMethodID: "checkout1-pm-1")) { error in
            XCTAssertEqual(error as? CoordinatorError, .staleCheckout)
        }
        let replacement = try coordinator.createController(checkoutID: replacementID, paymentMethodID: "checkout2-pm-1")
        XCTAssertNotEqual(replacement.controllerID, controller.controllerID)

        fixture.factory.shouldFail = true
        do {
            _ = try await coordinator.setup()
            XCTFail("Expected the replacement to fail")
        } catch {
            XCTAssertNil(coordinator.checkoutID)
            XCTAssertTrue(replacement.isDisposed)
            XCTAssertEqual(coordinator.controllerCount, 0)
            XCTAssertNil(coordinator.paymentMethodCatalog)
        }
    }

    // MARK: - Headless submit

    func test_submitControllerUsesTheRegistryComponentThroughTheOperationSlot() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let checkoutID = try await coordinator.setup()
        let checkout = try XCTUnwrap(fixture.factory.checkouts.last)
        let instant = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-2")
        let card = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-1")
        let instantComponent = checkout.createdComponents[0].component
        let cardComponent = checkout.createdComponents[1].component

        let operationID = try coordinator.submitController(checkoutID: checkoutID, controllerID: instant.controllerID)

        XCTAssertEqual(instantComponent.submitCount, 1)
        XCTAssertEqual(checkout.createdComponents.count, 2, "submit never creates a component")
        XCTAssertEqual(fixture.presenterFactory.createCount, 0)
        XCTAssertEqual(coordinator.operationID, operationID)

        XCTAssertThrowsError(try coordinator.submitController(checkoutID: checkoutID, controllerID: card.controllerID)) { error in
            XCTAssertEqual(error as? CoordinatorError, .operationBusy)
        }
        XCTAssertEqual(cardComponent.submitCount, 0)
        XCTAssertThrowsError(try coordinator.submitController(checkoutID: checkoutID, controllerID: "unknown")) { error in
            XCTAssertEqual(error as? CoordinatorError, .invalidTarget)
        }

        guard case let .explicit(adopted) = coordinator.acquireInitialEmbeddedOperation(checkoutID: checkoutID) else {
            return XCTFail("The SDK submit callback must adopt the controller operation")
        }
        XCTAssertEqual(adopted, operationID)
        let retry = try coordinator.beginRequest(operationID: operationID, kind: .advancedSubmit, timeout: 10)
        XCTAssertTrue(coordinator.resolve(retry))
        coordinator.releaseRetriedOperation(operationID)
        XCTAssertNil(coordinator.operationID, "a retry must not wedge the slot")
        XCTAssertFalse(instant.isDisposed, "releasing the slot never disposes the controller")

        try coordinator.submitController(checkoutID: checkoutID, controllerID: card.controllerID)
        XCTAssertEqual(cardComponent.submitCount, 1)
    }

    func test_submitPresentsAnUnboundInteractiveControllerInsteadOfSubmittingIt() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let checkoutID = try await coordinator.setup()
        let checkout = try XCTUnwrap(fixture.factory.checkouts.last)
        let card = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-1")
        let instant = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-2")
        let cardComponent = checkout.createdComponents[0].component
        let instantComponent = checkout.createdComponents[1].component
        var presented: [String] = []
        let present: @MainActor (ComponentProxy) throws -> CoordinatorPresenter = { controller in
            presented.append(controller.controllerID)
            return Presenter()
        }

        let missingHost: @MainActor (ComponentProxy) throws -> CoordinatorPresenter = { _ in
            throw CoordinatorError.noActiveCheckout
        }
        XCTAssertThrowsError(try coordinator.submitController(
            checkoutID: checkoutID,
            controllerID: card.controllerID,
            makeInteractivePresenter: missingHost
        ))
        XCTAssertNil(coordinator.operationID, "a failed presentation must not keep the slot")

        let operationID = try coordinator.submitController(
            checkoutID: checkoutID,
            controllerID: card.controllerID,
            makeInteractivePresenter: present
        )
        XCTAssertEqual(presented, [card.controllerID])
        XCTAssertEqual(cardComponent.submitCount, 0, "the shopper submits from the presented UI")
        XCTAssertEqual(coordinator.operationID, operationID)

        XCTAssertThrowsError(try coordinator.submitController(
            checkoutID: checkoutID,
            controllerID: card.controllerID,
            makeInteractivePresenter: present
        )) { error in
            XCTAssertEqual(error as? CoordinatorError, .operationBusy)
        }
        XCTAssertEqual(presented.count, 1, "a busy contender never presents")
        coordinator.completeOperation(operationID)

        try coordinator.submitController(
            checkoutID: checkoutID,
            controllerID: instant.controllerID,
            makeInteractivePresenter: present
        )
        XCTAssertEqual(instantComponent.submitCount, 1, "a controller without UI submits directly")
        XCTAssertEqual(presented.count, 1)
        try coordinator.completeOperation(XCTUnwrap(coordinator.operationID))

        let view = RecordingBinding()
        try card.bind(view)
        try coordinator.submitController(
            checkoutID: checkoutID,
            controllerID: card.controllerID,
            makeInteractivePresenter: present
        )
        XCTAssertEqual(cardComponent.submitCount, 1, "a bound controller submits its mounted form")
        XCTAssertEqual(presented.count, 1)
    }

    func test_cleanupSettlesPendingControllerRequestsOnceWithoutListeners() async throws {
        let triggers: [(String, @MainActor (CheckoutCoordinator) async throws -> Void)] = [
            ("invalidate", { coordinator in await coordinator.invalidate() }),
            ("replacement", { coordinator in _ = try await coordinator.setup() }),
            ("host loss", { coordinator in await coordinator.hostDidDisappear() })
        ]

        for (name, trigger) in triggers {
            let fixture = Fixture()
            let coordinator = fixture.makeCoordinator(eventSink: DiscardingEventSink())
            let checkoutID = try await coordinator.setup()
            let controller = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-2")
            let operationID = try coordinator.submitController(checkoutID: checkoutID, controllerID: controller.controllerID)
            var fallbacks = 0
            let submit = try coordinator.beginRequest(
                operationID: operationID,
                kind: .advancedSubmit,
                timeout: 10,
                cancellationFallback: { fallbacks += 1 }
            )
            let details = try coordinator.beginRequest(
                operationID: operationID,
                kind: .advancedAdditionalDetails,
                timeout: 10,
                cancellationFallback: { fallbacks += 1 }
            )

            try await trigger(coordinator)
            try await trigger(coordinator)

            XCTAssertEqual(fallbacks, 2, "\(name) must settle each request once")
            XCTAssertEqual(coordinator.pendingRequestCount, 0, name)
            XCTAssertFalse(coordinator.resolve(submit), name)
            XCTAssertFalse(coordinator.resolve(details), name)
            XCTAssertTrue(controller.isDisposed, name)
            XCTAssertTrue(fixture.scheduler.cancellations.allSatisfy(\.cancelled), name)
        }
    }

    // MARK: - Adapter commands

    func test_adapterControllerCommandsResolveDescriptorsAndMapErrors() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let adapter = makeAdapter(coordinator)
        let checkoutID = try await coordinator.setup()

        let created = await settle { adapter.createController(checkoutID, paymentMethodID: "checkout1-pm-1", resolver: $0, rejecter: $1) }
        let descriptor = try XCTUnwrap(created.value as? NSDictionary)
        let controllerID = try XCTUnwrap(descriptor["controllerId"] as? String)
        XCTAssertEqual(descriptor["requiresUserInteraction"] as? Bool, true)
        let again = await settle { adapter.createController(checkoutID, paymentMethodID: "checkout1-pm-1", resolver: $0, rejecter: $1) }
        XCTAssertEqual((again.value as? NSDictionary)?["controllerId"] as? String, controllerID)
        let instant = await settle { adapter.createController(checkoutID, paymentMethodID: "checkout1-pm-2", resolver: $0, rejecter: $1) }
        XCTAssertEqual((instant.value as? NSDictionary)?["requiresUserInteraction"] as? Bool, false)
        let instantControllerID = try XCTUnwrap((instant.value as? NSDictionary)?["controllerId"] as? String)

        let available = await settle { adapter.isAvailable(checkoutID, paymentMethodID: "checkout1-pm-1", resolver: $0, rejecter: $1) }
        XCTAssertEqual(available.value as? Bool, true)
        let unavailable = await settle { adapter.isAvailable(checkoutID, paymentMethodID: "checkout1-pm-3", resolver: $0, rejecter: $1) }
        XCTAssertEqual(unavailable.value as? Bool, false)
        XCTAssertNil(unavailable.code)
        let foreign = await settle { adapter.isAvailable(checkoutID, paymentMethodID: "foreign", resolver: $0, rejecter: $1) }
        XCTAssertEqual(foreign.code, "invalidTarget")
        let foreignController = await settle { adapter.createController(checkoutID, paymentMethodID: "foreign", resolver: $0, rejecter: $1) }
        XCTAssertEqual(foreignController.code, "invalidTarget")
        let unsupported = await settle { adapter.createController(checkoutID, paymentMethodID: "checkout1-pm-3", resolver: $0, rejecter: $1) }
        XCTAssertEqual(unsupported.code, "unsupportedCapability")

        let submitted = await settle { adapter.submitController(checkoutID, controllerID: instantControllerID, resolver: $0, rejecter: $1) }
        XCTAssertTrue(submitted.resolved)
        XCTAssertEqual(fixture.factory.checkouts.last?.createdComponents[1].component.submitCount, 1)
        let busy = await settle { adapter.submitController(checkoutID, controllerID: controllerID, resolver: $0, rejecter: $1) }
        XCTAssertEqual(busy.code, "operationBusy")

        await coordinator.invalidate()
        let stale = await settle { adapter.submitController(checkoutID, controllerID: controllerID, resolver: $0, rejecter: $1) }
        XCTAssertEqual(stale.code, "staleCheckout")
        let staleAvailability = await settle { adapter.isAvailable(checkoutID, paymentMethodID: "checkout1-pm-1", resolver: $0, rejecter: $1) }
        XCTAssertEqual(staleAvailability.code, "staleCheckout")
        let staleCreation = await settle { adapter.createController(checkoutID, paymentMethodID: "checkout1-pm-1", resolver: $0, rejecter: $1) }
        XCTAssertEqual(staleCreation.code, "staleCheckout")
    }

    // MARK: - Controller sheet

    func test_controllerSheetStaysCancellableAfterAdvancedRetry() async throws {
        for dismissal in SheetDismissal.allCases {
            let fixture = Fixture()
            let coordinator = fixture.makeCoordinator()
            let host = makeWindowedHost()
            coordinator.topPresenterProvider = { host }
            let adapter = makeAdapter(coordinator)
            var events: [NSDictionary] = []
            adapter.setEventSink { events.append($0) }
            let checkoutID = try await coordinator.setup()
            let card = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-1")
            let form = try XCTUnwrap(fixture.factory.checkouts.last?.createdComponents[0].component.viewController)

            let submitted = await settle { adapter.submitController(checkoutID, controllerID: card.controllerID, resolver: $0, rejecter: $1) }
            XCTAssertTrue(submitted.resolved, "\(dismissal)")
            XCTAssertNotNil(form.navigationController, "\(dismissal)")

            try await shopperSubmitsAndMerchantRetries(adapter, events: { events })
            XCTAssertNil(coordinator.operationID, "\(dismissal): a retry releases the slot")
            XCTAssertTrue(coordinator.isActive(checkoutID: checkoutID), "\(dismissal)")
            XCTAssertNotNil(form.navigationItem.leftBarButtonItem?.target, "\(dismissal): Cancel keeps a live receiver")
            XCTAssertNotNil(form.navigationController?.presentationController?.delegate, "\(dismissal): swipe keeps a live receiver")

            dismiss(form, by: dismissal)
            try await waitForCleanup(coordinator)
            dismiss(form, by: dismissal)
            await Task.yield()

            XCTAssertEqual(terminalKinds(events), ["error"], "\(dismissal) must deliver exactly one terminal")
            XCTAssertTrue(card.isDisposed, "\(dismissal)")
            XCTAssertEqual(coordinator.controllerCount, 0, "\(dismissal)")
            XCTAssertEqual(fixture.host.releaseCount, 1, "\(dismissal)")
        }
    }

    func test_resubmittingAVisibleControllerSheetReusesItWithinANewOperation() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let host = makeWindowedHost()
        coordinator.topPresenterProvider = { host }
        let adapter = makeAdapter(coordinator)
        var events: [NSDictionary] = []
        adapter.setEventSink { events.append($0) }
        let checkoutID = try await coordinator.setup()
        let card = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-1")
        let component = try XCTUnwrap(fixture.factory.checkouts.last?.createdComponents[0].component)
        let form = try XCTUnwrap(component.viewController)

        _ = await settle { adapter.submitController(checkoutID, controllerID: card.controllerID, resolver: $0, rejecter: $1) }
        let sheet = try XCTUnwrap(form.navigationController)
        try await shopperSubmitsAndMerchantRetries(adapter, events: { events })

        let again = await settle { adapter.submitController(checkoutID, controllerID: card.controllerID, resolver: $0, rejecter: $1) }
        XCTAssertTrue(again.resolved)
        XCTAssertNotNil(coordinator.operationID)
        XCTAssertTrue(form.navigationController === sheet, "the visible sheet is reused, never presented twice")
        XCTAssertEqual(coordinator.presenterStack.count, 1)
        XCTAssertEqual(component.submitCount, 0)

        dismiss(form, by: .cancelButton)
        try await waitForCleanup(coordinator)
        XCTAssertEqual(terminalKinds(events), ["error"])
    }

    func test_staleControllerSheetCannotCancelAReplacementCheckout() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let host = makeWindowedHost()
        coordinator.topPresenterProvider = { host }
        let adapter = makeAdapter(coordinator)
        var events: [NSDictionary] = []
        adapter.setEventSink { events.append($0) }
        let checkoutID = try await coordinator.setup()
        let staleCard = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-1")
        let staleForm = try XCTUnwrap(fixture.factory.checkouts.last?.createdComponents[0].component.viewController)
        _ = await settle { adapter.submitController(checkoutID, controllerID: staleCard.controllerID, resolver: $0, rejecter: $1) }
        try await shopperSubmitsAndMerchantRetries(adapter, events: { events })

        let replacementID = try await coordinator.setup()
        let replacementHost = makeWindowedHost()
        coordinator.topPresenterProvider = { replacementHost }
        let card = try coordinator.createController(checkoutID: replacementID, paymentMethodID: "checkout2-pm-1")
        let form = try XCTUnwrap(fixture.factory.checkouts.last?.createdComponents[0].component.viewController)
        let submitted = await settle { adapter.submitController(replacementID, controllerID: card.controllerID, resolver: $0, rejecter: $1) }
        XCTAssertTrue(submitted.resolved)
        let operationID = coordinator.operationID

        for dismissal in SheetDismissal.allCases {
            dismiss(staleForm, by: dismissal)
        }
        await Task.yield()
        XCTAssertTrue(terminalKinds(events).isEmpty, "a stale sheet must not end the replacement")
        XCTAssertTrue(coordinator.isActive(checkoutID: replacementID))
        XCTAssertEqual(coordinator.operationID, operationID)
        XCTAssertFalse(card.isDisposed)

        dismiss(form, by: .swipe)
        try await waitForCleanup(coordinator)
        XCTAssertEqual(terminalKinds(events), ["error"])
        XCTAssertTrue(card.isDisposed)
    }

    /// UIKit keeps a sheet's presentation controller, and so its dismissal delegate, only for a
    /// presentation from a view controller in a window.
    private func makeWindowedHost() -> UIViewController {
        let host = UIViewController()
        let window: UIWindow
        if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
            window = UIWindow(windowScene: scene)
        } else {
            window = UIWindow(frame: UIScreen.main.bounds)
        }
        window.rootViewController = host
        window.makeKeyAndVisible()
        addTeardownBlock { @MainActor in
            host.dismiss(animated: false)
            window.isHidden = true
        }
        return host
    }

    private enum SheetDismissal: CaseIterable {
        case cancelButton
        case swipe
    }

    private func dismiss(_ form: UIViewController, by dismissal: SheetDismissal) {
        switch dismissal {
        case .cancelButton:
            guard let item = form.navigationItem.leftBarButtonItem, let action = item.action else {
                return XCTFail("The sheet must install a Cancel button")
            }
            _ = (item.target as? NSObject)?.perform(action, with: item)
        case .swipe:
            guard let presentation = form.navigationController?.presentationController else {
                return XCTFail("The form must be embedded in a presented sheet")
            }
            presentation.delegate?.presentationControllerDidDismiss?(presentation)
        }
    }

    private func shopperSubmitsAndMerchantRetries(
        _ adapter: CheckoutTurboModuleAdapter,
        events: () -> [NSDictionary]
    ) async throws {
        let shopperSubmit = Task { await adapter.routeAdvancedSubmit(["paymentMethod": ["type": "scheme"]]) }
        var request: NSDictionary?
        for _ in 0..<100 {
            request = events().last { $0["kind"] as? String == "advancedSubmit" && $0["requestId"] != nil }
            if request != nil, adapter.pendingResponseCount > 0 {
                break
            }
            try await Task.sleep(for: .milliseconds(10))
        }
        let response = try XCTUnwrap(request?.mutableCopy() as? NSMutableDictionary)
        response["payloadJson"] = #"{"type":"retry"}"#
        var rejection: String?
        adapter.respond(response, resolver: { _ in }) { code, _, _ in rejection = code }
        XCTAssertNil(rejection)
        guard case .retry = await shopperSubmit.value else {
            return XCTFail("The merchant retry must reach the SDK")
        }
    }

    private func waitForCleanup(_ coordinator: CheckoutCoordinator) async throws {
        for _ in 0..<100 {
            if coordinator.checkoutID == nil {
                return
            }
            try await Task.sleep(for: .milliseconds(10))
        }
        XCTFail("Checkout cleanup did not run")
    }

    private func terminalKinds(_ events: [NSDictionary]) -> [String] {
        events.compactMap { $0["kind"] as? String }.filter { $0 == "error" || $0 == "completion" }
    }

    // MARK: - Address lookup ownership

    func test_detachingTheCardViewCancelsLookupButKeepsTheController() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let checkoutID = try await coordinator.setup()
        let card = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-1")
        let stored = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "stored-card")
        let cardView = AdyenComponentViewProxy(frame: .zero, coordinator: coordinator)
        let storedView = AdyenComponentViewProxy(frame: .zero, coordinator: coordinator)
        cardView.updateBinding(checkoutID: checkoutID, controllerID: card.controllerID)
        storedView.updateBinding(checkoutID: checkoutID, controllerID: stored.controllerID)
        let lookupOperation = try coordinator.acquireAddressLookupOperation(checkoutID: checkoutID)
        var fallbacks = 0
        let search = try coordinator.beginRequest(
            operationID: lookupOperation,
            kind: .addressLookupSearch,
            timeout: 10,
            cancellationFallback: { fallbacks += 1 }
        )

        storedView.detach()
        XCTAssertEqual(fallbacks, 0, "an unrelated view cannot cancel lookup")
        XCTAssertEqual(coordinator.operationID, lookupOperation)

        cardView.detach()
        XCTAssertEqual(fallbacks, 1)
        XCTAssertNil(coordinator.operationID)
        XCTAssertFalse(coordinator.resolve(search))
        XCTAssertEqual(coordinator.controllerCount, 2)
        XCTAssertFalse(card.isDisposed)
    }

    func test_lookupSearchTimeoutSettlesFallbackAndReleasesOnlyLookupOwnership() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let checkoutID = try await coordinator.setup()
        _ = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-1")
        let lookupOperation = try coordinator.acquireAddressLookupOperation(checkoutID: checkoutID)
        var fallbackCount = 0
        let search = try coordinator.beginRequest(
            operationID: lookupOperation,
            kind: .addressLookupSearch,
            timeout: 10,
            cancellationFallback: { fallbackCount += 1 }
        )

        fixture.scheduler.fireLast()

        XCTAssertEqual(fallbackCount, 1)
        XCTAssertEqual(coordinator.controllerCount, 1)
        XCTAssertEqual(coordinator.checkoutID, checkoutID)
        XCTAssertEqual(coordinator.pendingRequestCount, 0)
        XCTAssertNil(coordinator.operationID)
        XCTAssertFalse(coordinator.resolve(search))
        guard case .acquired = coordinator.acquireInitialEmbeddedOperation(checkoutID: checkoutID) else {
            return XCTFail("Lookup timeout must permit a fresh embedded operation")
        }
    }

    func test_lookupOwnershipReleasesExactlyOnceForCheckoutCleanupTriggers() async throws {
        let triggers: [(String, @MainActor (CheckoutCoordinator, String) async throws -> Void)] = [
            ("replacement", { coordinator, _ in _ = try await coordinator.setup() }),
            ("invalidation", { coordinator, _ in await coordinator.invalidate() }),
            ("host loss", { coordinator, _ in await coordinator.hostDidDisappear() }),
            ("terminal cleanup", { coordinator, checkoutID in try? await coordinator.invalidate(checkoutID: checkoutID) })
        ]

        for (name, trigger) in triggers {
            let fixture = Fixture()
            let coordinator = fixture.makeCoordinator()
            let checkoutID = try await coordinator.setup()
            _ = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-1")
            let lookupOperation = try coordinator.acquireAddressLookupOperation(checkoutID: checkoutID)
            var fallbackCount = 0
            let request = try coordinator.beginRequest(
                operationID: lookupOperation,
                kind: .addressLookupSelection,
                timeout: 10,
                cancellationFallback: { fallbackCount += 1 }
            )

            try await trigger(coordinator, checkoutID)
            try await trigger(coordinator, checkoutID)

            XCTAssertEqual(fallbackCount, 1, "\(name) must settle lookup once")
            XCTAssertFalse(coordinator.resolve(request), "\(name) must retire the lookup request")
        }
    }

    private func makeAdapter(_ coordinator: CheckoutCoordinator) -> CheckoutTurboModuleAdapter {
        CheckoutTurboModuleAdapter(coordinator: coordinator) { checkoutID in
            try coordinator.assertDropInAvailability(checkoutID: checkoutID)
        }
    }

    private struct PromiseOutcome {
        var resolved = false
        var value: Any?
        var code: String?
    }

    private func settle(
        _ call: (@escaping (Any?) -> Void, @escaping (String?, String?, Error?) -> Void) -> Void
    ) async -> PromiseOutcome {
        await withCheckedContinuation { continuation in
            call(
                { value in continuation.resume(returning: PromiseOutcome(resolved: true, value: value)) },
                { code, _, _ in continuation.resume(returning: PromiseOutcome(code: code)) }
            )
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

        func makeCoordinator(
            eventSink: CheckoutEventSink? = nil,
            debugAssertionReporter: @escaping CheckoutDebugAssertionReporter = { _ in }
        ) -> CheckoutCoordinator {
            CheckoutCoordinator(
                dependencies: CheckoutCoordinatorDependencies(
                    checkoutFactory: factory,
                    presenterFactory: presenterFactory,
                    eventSink: eventSink ?? events,
                    identityGenerator: identities,
                    scheduler: scheduler,
                    hostAdapter: host
                ),
                debugAssertionReporter: debugAssertionReporter
            )
        }
    }

    @MainActor
    private final class Factory: CheckoutFactory {
        let ledger: Ledger
        var shouldFail = false
        var unsupportedTypes: Set<String> = ["giftcard"]
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
            let checkout = Checkout(ledger: ledger, number: checkouts.count + 1, unsupportedTypes: unsupportedTypes)
            checkouts.append(checkout)
            return checkout
        }
    }

    @MainActor
    private final class Checkout: CoordinatorCheckout {
        let ledger: Ledger
        let number: Int
        let paymentMethodCatalog: PaymentMethodCatalog?
        private let unsupportedTypes: Set<String>
        private(set) var disposeCount = 0
        private(set) var createdComponents: [(paymentMethod: CatalogPaymentMethod, component: FakeComponent)] = []

        init(ledger: Ledger, number: Int, unsupportedTypes: Set<String>) {
            self.ledger = ledger
            self.number = number
            self.unsupportedTypes = unsupportedTypes
            var nextID = 0
            paymentMethodCatalog = PaymentMethodCatalog(paymentMethods: fixturePaymentMethods()) {
                nextID += 1
                return "checkout\(number)-pm-\(nextID)"
            }
            ledger.entries.append("create-\(number)")
        }

        var checkoutState: CheckoutState? {
            nil
        }

        func makePaymentComponent(for paymentMethod: CatalogPaymentMethod) throws -> PaymentComponentHandle {
            let component: FakeComponent
            switch paymentMethod {
            case let .regular(_, type, _):
                guard !unsupportedTypes.contains(type.rawValue) else { throw TestError.factory }
                component = FakeComponent(hasView: type.rawValue != "paypal")
            case .stored:
                component = FakeComponent(hasView: true)
            }
            createdComponents.append((paymentMethod, component))
            return component
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
    private final class FakeComponent: PaymentComponentHandle {
        let viewController: UIViewController?
        private(set) var submitCount = 0

        init(hasView: Bool) {
            viewController = hasView ? UIViewController() : nil
        }

        func submit() {
            submitCount += 1
        }
    }

    @MainActor
    private final class RecordingBinding: ControllerViewBinding {
        var ledger: Ledger?
        private(set) var disposals = 0

        func controllerDidDispose(_: ComponentProxy) {
            disposals += 1
            ledger?.entries.append("controller-disposed")
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
            case .controller: return "controller-\(next)"
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

private func fixturePaymentMethods() -> PaymentMethods {
    let json: [String: Any] = [
        "paymentMethods": [
            ["type": "scheme", "name": "Cards", "brands": ["visa", "mc"]],
            ["type": "paypal", "name": "PayPal"],
            ["type": "giftcard", "name": "Givex", "brand": "givex"],
            ["type": "giftcard", "name": "SVS", "brand": "svs"]
        ],
        "storedPaymentMethods": [
            [
                "type": "scheme",
                "id": "stored-card",
                "name": "VISA",
                "brand": "visa",
                "lastFour": "1111",
                "expiryMonth": "03",
                "expiryYear": "2030",
                "holderName": "Checkout Shopper",
                "supportedShopperInteractions": ["Ecommerce", "ContAuth"]
            ]
        ]
    ]
    // swiftlint:disable:next force_try
    return try! (json as NSDictionary).decode()
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
