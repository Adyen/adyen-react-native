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

    // MARK: - Registry semantics: teardown matrix

    func test_everyTeardownPathDisposesEachRegisteredControllerOnceAfterDetachingItsViews() async throws {
        for path in TeardownPath.allCases {
            let fixture = Fixture()
            let coordinator = fixture.makeCoordinator()
            let adapter = makeAdapter(coordinator)
            let checkoutID = try await setUpOwnedCheckout(coordinator, fixture)
            let checkout = try XCTUnwrap(fixture.factory.checkouts.last)

            XCTAssertTrue(try coordinator.isAvailable(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-2"), "\(path)")
            let instant = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-2")
            let card = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-1")
            let stored = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "stored-card")
            let cardForm = try XCTUnwrap(card.viewController)
            let host = UIViewController()
            let cardView = AdyenComponentViewProxy(frame: .zero, coordinator: coordinator)
            host.view.addSubview(cardView)
            cardView.updateBinding(checkoutID: checkoutID, controllerID: card.controllerID)
            XCTAssertTrue(cardForm.parent === host, "\(path)")
            let storedView = RecordingBinding()
            storedView.ledger = fixture.ledger
            try stored.bind(storedView)
            var stateAtCheckoutDisposal: [Bool]?
            checkout.onDispose = {
                stateAtCheckoutDisposal = [
                    instant.isDisposed,
                    card.isDisposed,
                    stored.isDisposed,
                    cardView.arrangedSubviews.isEmpty,
                    cardForm.parent == nil
                ]
            }

            try await tearDown(path, coordinator, adapter, fixture, checkoutID: checkoutID)
            try await tearDown(path, coordinator, adapter, fixture, checkoutID: checkoutID)

            XCTAssertEqual(
                stateAtCheckoutDisposal,
                [true, true, true, true, true],
                "\(path): controllers are disposed and views detached before the checkout is disposed"
            )
            let log = fixture.log
            XCTAssertEqual(log.filter { $0 == "controller-disposed" }.count, 1, "\(path)")
            XCTAssertEqual(log.filter { $0 == "dispose-1" }.count, 1, "\(path)")
            let controllerDisposal = try XCTUnwrap(log.firstIndex(of: "controller-disposed"), "\(path)")
            let checkoutDisposal = try XCTUnwrap(log.firstIndex(of: "dispose-1"), "\(path)")
            let hostRelease = try XCTUnwrap(log.firstIndex(of: "host-release"), "\(path)")
            XCTAssertLessThan(controllerDisposal, checkoutDisposal, "\(path)")
            XCTAssertLessThan(checkoutDisposal, hostRelease, "\(path)")
            XCTAssertEqual(checkout.disposeCount, 1, "\(path)")
            XCTAssertEqual(fixture.cleanups(of: checkoutID), 1, "\(path)")
            XCTAssertEqual(checkout.createdComponents.count, 3, "\(path): availability registered the controller creation reused")
            XCTAssertEqual(coordinator.controllerCount, 0, "\(path)")
            for controller in [instant, card, stored] {
                XCTAssertTrue(controller.isDisposed, "\(path)")
                XCTAssertFalse(controller.isBound, "\(path)")
                XCTAssertNil(controller.viewController, "\(path)")
            }
            XCTAssertNil(cardView.boundControllerID, "\(path)")
            XCTAssertTrue(cardView.arrangedSubviews.isEmpty, "\(path)")
            XCTAssertNil(cardForm.parent, "\(path)")
            XCTAssertNil(cardForm.view.superview, "\(path)")

            cardView.detach()
            stored.dispose()
            XCTAssertEqual(storedView.disposals, 1, "\(path): disposal is idempotent per controller")
        }
    }

    func test_controllerWorkStartedFromADisposalCallbackIsRejectedAsStale() async throws {
        for path in TeardownPath.allCases {
            let fixture = Fixture()
            let coordinator = fixture.makeCoordinator()
            let adapter = makeAdapter(coordinator)
            let checkoutID = try await setUpOwnedCheckout(coordinator, fixture)
            let checkout = try XCTUnwrap(fixture.factory.checkouts.last)
            let card = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-1")
            var outcomes: [String] = []
            let view = RecordingBinding()
            view.onDispose = { _ in
                outcomes = [
                    outcome { _ = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "stored-card") },
                    outcome { _ = try coordinator.isAvailable(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-2") },
                    outcome { try coordinator.submitController(checkoutID: checkoutID, controllerID: card.controllerID) },
                    outcome { _ = try coordinator.beginOperation(checkoutID: checkoutID) },
                    outcome { try coordinator.assertDropInAvailability(checkoutID: checkoutID) },
                    coordinator.acquireEmbeddedOperation(checkoutID: checkoutID) == nil ? "competing" : "acquired"
                ]
            }
            try card.bind(view)

            try await tearDown(path, coordinator, adapter, fixture, checkoutID: checkoutID)

            XCTAssertEqual(
                outcomes,
                Array(repeating: "staleCheckout", count: 5) + ["competing"],
                "\(path): a torn-down checkout accepts no new work"
            )
            XCTAssertEqual(view.disposals, 1, "\(path)")
            XCTAssertEqual(checkout.createdComponents.count, 1, "\(path)")
            XCTAssertEqual(coordinator.controllerCount, 0, "\(path): nothing leaks into the next registry")
            XCTAssertNil(coordinator.operationID, "\(path): nothing leaks into the next operation slot")
        }
    }

    func test_concurrentCreateAndAvailabilityCallsShareOneControllerPerPaymentMethod() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let adapter = makeAdapter(coordinator)
        let checkoutID = try await coordinator.setup()
        let checkout = try XCTUnwrap(fixture.factory.checkouts.last)
        let settled = expectation(description: "every call settles")
        settled.expectedFulfillmentCount = 16
        var controllerIDs: [String] = []
        var availability: [String: [Bool]] = [:]
        var rejections: [String: [String]] = [:]

        for paymentMethodID in ["checkout1-pm-1", "checkout1-pm-3"] {
            for _ in 0..<4 {
                adapter.createController(
                    checkoutID,
                    paymentMethodID: paymentMethodID,
                    resolver: { value in
                        if let controllerID = (value as? NSDictionary)?["controllerId"] as? String {
                            controllerIDs.append(controllerID)
                        }
                        settled.fulfill()
                    },
                    rejecter: { code, _, _ in
                        rejections[paymentMethodID, default: []].append(code ?? "")
                        settled.fulfill()
                    }
                )
                adapter.isAvailable(
                    checkoutID,
                    paymentMethodID: paymentMethodID,
                    resolver: { value in
                        availability[paymentMethodID, default: []].append(value as? Bool ?? false)
                        settled.fulfill()
                    },
                    rejecter: { code, _, _ in
                        rejections[paymentMethodID, default: []].append(code ?? "")
                        settled.fulfill()
                    }
                )
            }
        }
        await fulfillment(of: [settled], timeout: 2)

        XCTAssertEqual(controllerIDs.count, 4)
        XCTAssertEqual(Set(controllerIDs).count, 1, "duplicate creation resolves the same controller")
        XCTAssertEqual(availability["checkout1-pm-1"], [true, true, true, true])
        XCTAssertEqual(availability["checkout1-pm-3"], [false, false, false, false])
        XCTAssertEqual(rejections["checkout1-pm-3"], Array(repeating: "unsupportedCapability", count: 4))
        XCTAssertNil(rejections["checkout1-pm-1"])
        XCTAssertEqual(checkout.makeAttempts, 2, "each payment method is built at most once")
        XCTAssertEqual(checkout.createdComponents.count, 1)
        XCTAssertEqual(coordinator.controllerCount, 1)

        let controller = try coordinator.controller(checkoutID: checkoutID, controllerID: XCTUnwrap(controllerIDs.first))
        let view = RecordingBinding()
        try controller.bind(view)
        await coordinator.invalidate()
        await coordinator.invalidate()
        XCTAssertEqual(view.disposals, 1)
    }

    func test_creationQueuedBehindTeardownRejectsStaleAndNeverOutlivesTheCheckout() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let adapter = makeAdapter(coordinator)
        let checkoutID = try await coordinator.setup()
        let checkout = try XCTUnwrap(fixture.factory.checkouts.last)
        let settled = expectation(description: "every call settles")
        settled.expectedFulfillmentCount = 3
        var outcomes: [String] = []
        let resolve: (String) -> (Any?) -> Void = { label in
            { _ in
                outcomes.append(label)
                settled.fulfill()
            }
        }
        let reject: (String?, String?, Error?) -> Void = { code, _, _ in
            outcomes.append(code ?? "")
            settled.fulfill()
        }

        adapter.createController(checkoutID, paymentMethodID: "checkout1-pm-1", resolver: resolve("created"), rejecter: reject)
        adapter.invalidate(checkoutID, resolver: resolve("invalidated"), rejecter: reject)
        adapter.createController(checkoutID, paymentMethodID: "checkout1-pm-2", resolver: resolve("created"), rejecter: reject)
        await fulfillment(of: [settled], timeout: 2)

        XCTAssertEqual(outcomes.sorted(), ["created", "invalidated", "staleCheckout"])
        XCTAssertEqual(checkout.createdComponents.count, 1)
        XCTAssertEqual(coordinator.controllerCount, 0)
        XCTAssertNil(coordinator.checkoutID)
    }

    // MARK: - Registry semantics: operation slot

    func test_operationSlotRejectsEveryContenderUntilItsOwnerReleasesIt() async throws {
        for owner in SlotOwner.allCases {
            for contender in SlotContender.allCases {
                let label = "\(owner) vs \(contender)"
                let fixture = Fixture()
                let coordinator = fixture.makeCoordinator()
                let adapter = makeAdapter(coordinator)
                var events: [NSDictionary] = []
                adapter.setEventSink { events.append($0) }
                let checkoutID = try await coordinator.setup()
                let checkout = try XCTUnwrap(fixture.factory.checkouts.last)
                let card = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-1")
                let instant = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-2")
                let stored = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "stored-card")
                try card.bind(RecordingBinding())
                try stored.bind(RecordingBinding())

                let ownerController: ComponentProxy
                var shopperSubmit: ShopperSubmit?
                switch owner {
                case .explicitHeadless, .explicitMounted:
                    ownerController = owner == .explicitHeadless ? instant : card
                    let submitted = await submitCode(adapter, checkoutID, ownerController)
                    XCTAssertEqual(submitted, "ok", label)
                    shopperSubmit = try await startShopperSubmit(adapter, events: { events })
                case .embedded:
                    ownerController = card
                    shopperSubmit = try await startShopperSubmit(adapter, events: { events })
                case .addressLookup:
                    ownerController = card
                    _ = try coordinator.acquireAddressLookupOperation(checkoutID: checkoutID)
                }
                let ownerOperation = try XCTUnwrap(coordinator.operationID, label)
                if let shopperSubmit {
                    XCTAssertEqual(
                        shopperSubmit.request["operationId"] as? String,
                        ownerOperation,
                        "\(label): the callback claims the owner's operation"
                    )
                }
                let submitCounts = checkout.createdComponents.map(\.component.submitCount)
                let pendingResponses = adapter.pendingResponseCount

                let contended = await contend(contender, adapter, coordinator, checkoutID: checkoutID, owner: ownerController, other: stored)

                let isExplicitOwner = owner == .explicitHeadless || owner == .explicitMounted
                let expectedContention = switch contender {
                case .sameController, .otherController, .dropIn: "operationBusy"
                case .embeddedCallback: isExplicitOwner ? "adopted:\(ownerOperation)" : "competing"
                }
                XCTAssertEqual(contended, expectedContention, label)
                XCTAssertEqual(coordinator.operationID, ownerOperation, "\(label): the owner keeps the slot")
                XCTAssertEqual(
                    checkout.createdComponents.map(\.component.submitCount),
                    submitCounts,
                    "\(label): a contender never reaches the SDK"
                )
                XCTAssertEqual(adapter.pendingResponseCount, pendingResponses, label)
                XCTAssertEqual(fixture.presenterFactory.createCount, 0, label)

                if let shopperSubmit {
                    XCTAssertNil(respond(adapter, to: shopperSubmit.request, payloadJSON: retryPayload), label)
                    guard case .retry = await shopperSubmit.task.value else {
                        XCTFail("\(label): the owner's retry must reach the SDK")
                        continue
                    }
                } else {
                    coordinator.completeAddressLookupOperation(ownerOperation)
                }
                XCTAssertNil(coordinator.operationID, "\(label): releasing the owner frees the slot")

                let released = await contend(contender, adapter, coordinator, checkoutID: checkoutID, owner: ownerController, other: stored)
                let expectedAfterRelease = switch contender {
                case .sameController, .otherController: "ok"
                case .dropIn: "unsupportedCapability"
                case .embeddedCallback: "acquired"
                }
                XCTAssertEqual(released, expectedAfterRelease, label)
            }
        }
    }

    func test_resubmittingTheSameControllerIsBusyUntilRetryTerminalOrCleanupReleasesIt() async throws {
        for release in ExplicitRelease.allCases {
            let fixture = Fixture()
            let coordinator = fixture.makeCoordinator()
            let adapter = makeAdapter(coordinator)
            var events: [NSDictionary] = []
            adapter.setEventSink { events.append($0) }
            let checkoutID = try await coordinator.setup()
            let checkout = try XCTUnwrap(fixture.factory.checkouts.last)
            let instant = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-2")
            let component = try XCTUnwrap(checkout.createdComponents.first?.component)

            var submitted = await submitCode(adapter, checkoutID, instant)
            XCTAssertEqual(submitted, "ok", "\(release)")
            let operationID = try XCTUnwrap(coordinator.operationID)
            submitted = await submitCode(adapter, checkoutID, instant)
            XCTAssertEqual(submitted, "operationBusy", "\(release): a re-submit never starts a second operation")
            let shopperSubmit = try await startShopperSubmit(adapter, events: { events })
            XCTAssertEqual(shopperSubmit.request["operationId"] as? String, operationID, "\(release)")
            submitted = await submitCode(adapter, checkoutID, instant)
            XCTAssertEqual(submitted, "operationBusy", "\(release)")
            XCTAssertEqual(component.submitCount, 1, "\(release)")
            XCTAssertEqual(coordinator.operationID, operationID, "\(release)")

            switch release {
            case .retry:
                XCTAssertNil(respond(adapter, to: shopperSubmit.request, payloadJSON: retryPayload))
                guard case .retry = await shopperSubmit.task.value else {
                    XCTFail("The merchant retry must reach the SDK")
                    continue
                }
                XCTAssertNil(coordinator.operationID, "a retry releases the slot")
                submitted = await submitCode(adapter, checkoutID, instant)
                XCTAssertEqual(submitted, "ok", "the controller can submit again after a retry")
                XCTAssertEqual(component.submitCount, 2)
                let nextOperationID = try XCTUnwrap(coordinator.operationID)
                XCTAssertNotEqual(nextOperationID, operationID)
                submitted = await submitCode(adapter, checkoutID, instant)
                XCTAssertEqual(submitted, "operationBusy", "the new submission owns the slot again")
                XCTAssertFalse(instant.isDisposed)
            case .terminal:
                XCTAssertNil(respond(adapter, to: shopperSubmit.request, payloadJSON: actionPayload))
                guard case .action = await shopperSubmit.task.value else {
                    XCTFail("The action must reach the SDK")
                    continue
                }
                XCTAssertEqual(coordinator.operationID, operationID, "an action keeps the slot")
                submitted = await submitCode(adapter, checkoutID, instant)
                XCTAssertEqual(submitted, "operationBusy")

                let eventCount = events.count
                let details = Task { await adapter.routeAdvancedAdditionalDetails(["details": [:]]) }
                let detailsRequest = try await awaitRequest("advancedAdditionalDetails", after: eventCount, events: { events })
                XCTAssertEqual(detailsRequest["operationId"] as? String, operationID)
                XCTAssertNil(respond(adapter, to: detailsRequest, payloadJSON: #"{"resultCode":"Authorised"}"#))
                _ = await details.value
                submitted = await submitCode(adapter, checkoutID, instant)
                XCTAssertEqual(submitted, "operationBusy", "additional details keep the slot")

                adapter.routeTerminal(kind: "completion", payload: ["resultCode": "Authorised"])
                XCTAssertEqual(events.last?["kind"] as? String, "completion")
                XCTAssertEqual(events.last?["operationId"] as? String, operationID, "the terminal belongs to the submission")
                try await waitForCleanup(coordinator)
                submitted = await submitCode(adapter, checkoutID, instant)
                XCTAssertEqual(submitted, "staleCheckout")
            case .cleanup:
                await coordinator.invalidate()
                guard case let .completion(resultCode) = await shopperSubmit.task.value else {
                    XCTFail("Cleanup must settle the suspended submit")
                    continue
                }
                XCTAssertEqual(resultCode, errorResultCode)
                submitted = await submitCode(adapter, checkoutID, instant)
                XCTAssertEqual(submitted, "staleCheckout")
            }
            if release != .retry {
                XCTAssertTrue(instant.isDisposed, "\(release)")
                XCTAssertEqual(component.submitCount, 1, "\(release)")
                XCTAssertNil(coordinator.operationID, "\(release)")
            }
        }
    }

    // MARK: - Registry semantics: request correlation

    func test_controllerOwnedRequestsSettleOnlyFromTheirCurrentExactResponse() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let adapter = makeAdapter(coordinator)
        var events: [NSDictionary] = []
        adapter.setEventSink { events.append($0) }
        let checkoutID = try await coordinator.setup()
        let instant = try coordinator.createController(checkoutID: checkoutID, paymentMethodID: "checkout1-pm-2")
        let submitted = await submitCode(adapter, checkoutID, instant)
        XCTAssertEqual(submitted, "ok")
        let operationID = try XCTUnwrap(coordinator.operationID)

        let first = try await startShopperSubmit(adapter, events: { events })
        XCTAssertEqual(first.request["checkoutId"] as? String, checkoutID)
        XCTAssertEqual(first.request["operationId"] as? String, operationID)

        let forgeries: [(String, [String: Any], [String])] = [
            ("checkout", ["checkoutId": "forged"], []),
            ("operation", ["operationId": "forged"], []),
            ("request", ["requestId": "forged"], []),
            ("kind", ["kind": "advancedAdditionalDetails"], []),
            ("missing operation", [:], ["operationId"]),
            ("missing request", [:], ["requestId"])
        ]
        for (name, overrides, removals) in forgeries {
            XCTAssertEqual(
                respond(adapter, to: first.request, payloadJSON: retryPayload, overriding: overrides, removing: removals),
                "staleRequest",
                "a forged \(name) cannot settle the request"
            )
        }
        XCTAssertEqual(adapter.pendingResponseCount, 1)
        XCTAssertEqual(coordinator.pendingRequestCount, 1)
        XCTAssertEqual(coordinator.operationID, operationID, "a forged retry cannot release the slot")

        let second = try await startShopperSubmit(adapter, events: { events })
        guard case let .completion(supersededCode) = await first.task.value else {
            return XCTFail("A superseded callback must settle with the native error result")
        }
        XCTAssertEqual(supersededCode, errorResultCode)
        XCTAssertEqual(second.request["operationId"] as? String, operationID)
        XCTAssertNotEqual(second.request["requestId"] as? String, first.request["requestId"] as? String)
        XCTAssertEqual(
            respond(adapter, to: first.request, payloadJSON: retryPayload),
            "staleRequest",
            "a superseded response cannot settle its successor"
        )
        XCTAssertEqual(adapter.pendingResponseCount, 1)
        XCTAssertEqual(coordinator.operationID, operationID)

        fixture.scheduler.fireLast()
        guard case let .completion(timedOutCode) = await second.task.value else {
            return XCTFail("A timed-out callback must settle with the native error result")
        }
        XCTAssertEqual(timedOutCode, errorResultCode)
        XCTAssertEqual(respond(adapter, to: second.request, payloadJSON: retryPayload), "staleRequest", "a late response is stale")
        XCTAssertEqual(coordinator.operationID, operationID, "a late retry cannot release the slot")

        let third = try await startShopperSubmit(adapter, events: { events })
        XCTAssertNil(respond(adapter, to: third.request, payloadJSON: actionPayload))
        XCTAssertEqual(respond(adapter, to: third.request, payloadJSON: retryPayload), "staleRequest", "a duplicate response is stale")
        guard case .action = await third.task.value else {
            return XCTFail("The exact response must settle the current callback")
        }

        let eventCount = events.count
        let details = Task { await adapter.routeAdvancedAdditionalDetails(["details": [:]]) }
        let detailsRequest = try await awaitRequest("advancedAdditionalDetails", after: eventCount, events: { events })
        let replacementID = try await coordinator.setup()
        guard case let .completion(cleanedUpCode) = await details.value else {
            return XCTFail("Replacement must settle the suspended callback")
        }
        XCTAssertEqual(cleanedUpCode, errorResultCode)
        XCTAssertEqual(respond(adapter, to: detailsRequest, payloadJSON: #"{"resultCode":"Authorised"}"#), "staleRequest")
        XCTAssertEqual(
            respond(
                adapter,
                to: detailsRequest,
                payloadJSON: #"{"resultCode":"Authorised"}"#,
                overriding: ["checkoutId": replacementID]
            ),
            "staleRequest",
            "a response cannot be replayed into the replacement checkout"
        )
        XCTAssertTrue(coordinator.isActive(checkoutID: replacementID))
        XCTAssertNil(coordinator.operationID)
        XCTAssertEqual(adapter.pendingResponseCount, 0)
        XCTAssertTrue(instant.isDisposed)
    }

    // MARK: - Registry semantics: interaction and stale identities

    func test_requiresUserInteractionReportsTheViewControllerReadOnceAtCreation() async throws {
        let fixture = Fixture()
        let coordinator = fixture.makeCoordinator()
        let adapter = makeAdapter(coordinator)
        let checkoutID = try await coordinator.setup()
        let checkout = try XCTUnwrap(fixture.factory.checkouts.last)
        let fresh = FreshViewComponent()
        let headless = FakeComponent(hasView: false)
        checkout.componentOverride = { paymentMethod -> PaymentComponentHandle? in
            switch paymentMethod {
            case .regular(index: 0, _, _): return fresh
            case .regular(index: 1, _, _): return headless
            default: return nil
            }
        }

        let interactive = await settle { adapter.createController(checkoutID, paymentMethodID: "checkout1-pm-1", resolver: $0, rejecter: $1) }
        let instant = await settle { adapter.createController(checkoutID, paymentMethodID: "checkout1-pm-2", resolver: $0, rejecter: $1) }
        let stored = await settle { adapter.createController(checkoutID, paymentMethodID: "stored-card", resolver: $0, rejecter: $1) }
        XCTAssertEqual((interactive.value as? NSDictionary)?["requiresUserInteraction"] as? Bool, true)
        XCTAssertEqual((instant.value as? NSDictionary)?["requiresUserInteraction"] as? Bool, false)
        XCTAssertEqual((stored.value as? NSDictionary)?["requiresUserInteraction"] as? Bool, true)
        XCTAssertEqual(fresh.viewControllerAccesses, 1)

        let card = try coordinator.controller(
            checkoutID: checkoutID,
            controllerID: XCTUnwrap((interactive.value as? NSDictionary)?["controllerId"] as? String)
        )
        let form = try XCTUnwrap(card.viewController)
        XCTAssertTrue(card.viewController === form)
        let host = UIViewController()
        let cardView = AdyenComponentViewProxy(frame: .zero, coordinator: coordinator)
        host.view.addSubview(cardView)
        cardView.updateBinding(checkoutID: checkoutID, controllerID: card.controllerID)
        XCTAssertEqual(cardView.arrangedSubviews, [form.view], "the view embeds the instance creation reported")
        cardView.detach()

        var presented: UIViewController?
        let operationID = try coordinator.submitController(checkoutID: checkoutID, controllerID: card.controllerID) { controller in
            presented = controller.viewController
            return Presenter()
        }
        XCTAssertTrue(presented === form, "an unbound submit presents the instance creation reported")
        XCTAssertEqual(fresh.viewControllerAccesses, 1, "binding and presenting never rebuild the form")
        XCTAssertEqual(fresh.submitCount, 0)
        coordinator.completeOperation(operationID)

        let headlessController = try coordinator.controller(
            checkoutID: checkoutID,
            controllerID: XCTUnwrap((instant.value as? NSDictionary)?["controllerId"] as? String)
        )
        XCTAssertFalse(headlessController.requiresUserInteraction)
        XCTAssertNil(headlessController.viewController)
        try coordinator.submitController(checkoutID: checkoutID, controllerID: headlessController.controllerID) { _ in
            XCTFail("A controller without UI must not be presented")
            return Presenter()
        }
        XCTAssertEqual(headless.submitCount, 1)
        let headlessView = AdyenComponentViewProxy(frame: .zero, coordinator: coordinator)
        headlessView.updateBinding(checkoutID: checkoutID, controllerID: headlessController.controllerID)
        XCTAssertEqual(headlessView.boundControllerID, headlessController.controllerID)
        XCTAssertTrue(headlessView.arrangedSubviews.isEmpty)

        await coordinator.invalidate()
        XCTAssertNil(card.viewController)
        XCTAssertNil(headlessView.boundControllerID)
    }

    func test_staleControllerIDsRejectAfterEveryTeardownPath() async throws {
        for path in TeardownPath.allCases {
            let fixture = Fixture()
            let coordinator = fixture.makeCoordinator()
            let adapter = makeAdapter(coordinator)
            let staleCheckoutID = try await setUpOwnedCheckout(coordinator, fixture)
            let card = try coordinator.createController(checkoutID: staleCheckoutID, paymentMethodID: "checkout1-pm-1")
            let instant = try coordinator.createController(checkoutID: staleCheckoutID, paymentMethodID: "checkout1-pm-2")

            try await tearDown(path, coordinator, adapter, fixture, checkoutID: staleCheckoutID)

            var staleCodes: [String] = []
            for controller in [card, instant] {
                let submitted = await submitCode(adapter, staleCheckoutID, controller)
                staleCodes.append(submitted)
            }
            let created = await settle { adapter.createController(staleCheckoutID, paymentMethodID: "checkout1-pm-1", resolver: $0, rejecter: $1) }
            let available = await settle { adapter.isAvailable(staleCheckoutID, paymentMethodID: "checkout1-pm-1", resolver: $0, rejecter: $1) }
            let dropIn = await settle { adapter.startDropIn(staleCheckoutID, resolver: $0, rejecter: $1) }
            let invalidated = await settle { adapter.invalidate(staleCheckoutID, resolver: $0, rejecter: $1) }
            staleCodes += [created, available, dropIn, invalidated].map { $0.code ?? "resolved" }
            XCTAssertEqual(staleCodes, Array(repeating: "staleCheckout", count: 6), "\(path)")
            let staleView = AdyenComponentViewProxy(frame: .zero, coordinator: coordinator)
            staleView.updateBinding(checkoutID: staleCheckoutID, controllerID: card.controllerID)
            XCTAssertNil(staleView.boundControllerID, "\(path)")

            let currentID: String
            if let replacementID = coordinator.checkoutID {
                currentID = replacementID
            } else {
                currentID = try await setUpOwnedCheckout(coordinator, fixture)
            }
            XCTAssertNotEqual(currentID, staleCheckoutID, "\(path)")
            let crossSubmit = await settle { adapter.submitController(currentID, controllerID: card.controllerID, resolver: $0, rejecter: $1) }
            let crossCreate = await settle { adapter.createController(currentID, paymentMethodID: "checkout1-pm-1", resolver: $0, rejecter: $1) }
            let crossAvailability = await settle { adapter.isAvailable(currentID, paymentMethodID: "checkout1-pm-1", resolver: $0, rejecter: $1) }
            XCTAssertEqual(
                [crossSubmit, crossCreate, crossAvailability].map { $0.code ?? "resolved" },
                ["invalidTarget", "invalidTarget", "invalidTarget"],
                "\(path): a stale identity is foreign to the next checkout"
            )
            staleView.updateBinding(checkoutID: currentID, controllerID: card.controllerID)
            XCTAssertNil(staleView.boundControllerID, "\(path)")
            XCTAssertNil(coordinator.operationID, "\(path)")
            XCTAssertEqual(coordinator.controllerCount, 0, "\(path)")
            XCTAssertTrue(card.isDisposed && instant.isDisposed, "\(path)")
        }
    }

    private static let moduleOwner = "module-a"
    private let retryPayload = #"{"type":"retry"}"#
    private let actionPayload = #"{"type":"action","action":{"type":"redirect","paymentMethodType":"scheme","url":"https://example.test"}}"#

    private enum TeardownPath: CaseIterable {
        case invalidate
        case replacement
        case terminal
        case hostLoss
    }

    private enum SlotOwner: CaseIterable {
        case explicitHeadless
        case explicitMounted
        case embedded
        case addressLookup
    }

    private enum SlotContender: CaseIterable {
        case sameController
        case otherController
        case dropIn
        case embeddedCallback
    }

    private enum ExplicitRelease: CaseIterable {
        case retry
        case terminal
        case cleanup
    }

    private struct ShopperSubmit {
        let task: Task<SubmitResult?, Never>
        let request: NSDictionary
    }

    private func setUpOwnedCheckout(_ coordinator: CheckoutCoordinator, _ fixture: Fixture) async throws -> String {
        try await coordinator.setup(ownerID: Self.moduleOwner) {
            try await fixture.factory.makeCheckout()
        }
    }

    /// Drives each teardown path through the entry point production uses for it.
    private func tearDown(
        _ path: TeardownPath,
        _ coordinator: CheckoutCoordinator,
        _ adapter: CheckoutTurboModuleAdapter,
        _ fixture: Fixture,
        checkoutID: String
    ) async throws {
        switch path {
        case .invalidate:
            _ = await settle { adapter.invalidate(checkoutID, resolver: $0, rejecter: $1) }
        case .replacement:
            _ = try await setUpOwnedCheckout(coordinator, fixture)
        case .terminal:
            adapter.routeTerminal(kind: "completion", payload: ["resultCode": "Authorised"])
        case .hostLoss:
            await coordinator.hostDidDisappear(ownerID: Self.moduleOwner)
        }
        try await waitUntil("\(path) cleanup") { fixture.cleanups(of: checkoutID) > 0 }
    }

    private func contend(
        _ contender: SlotContender,
        _ adapter: CheckoutTurboModuleAdapter,
        _ coordinator: CheckoutCoordinator,
        checkoutID: String,
        owner: ComponentProxy,
        other: ComponentProxy
    ) async -> String {
        switch contender {
        case .sameController:
            return await submitCode(adapter, checkoutID, owner)
        case .otherController:
            return await submitCode(adapter, checkoutID, other)
        case .dropIn:
            let outcome = await settle { adapter.startDropIn(checkoutID, resolver: $0, rejecter: $1) }
            return outcome.resolved ? "ok" : outcome.code ?? "unknown"
        case .embeddedCallback:
            switch coordinator.acquireInitialEmbeddedOperation(checkoutID: checkoutID) {
            case let .explicit(operationID): return "adopted:\(operationID)"
            case .acquired: return "acquired"
            case .competing: return "competing"
            }
        }
    }

    private func submitCode(_ adapter: CheckoutTurboModuleAdapter, _ checkoutID: String, _ controller: ComponentProxy) async -> String {
        let outcome = await settle { adapter.submitController(checkoutID, controllerID: controller.controllerID, resolver: $0, rejecter: $1) }
        return outcome.resolved ? "ok" : outcome.code ?? "unknown"
    }

    /// Simulates the SDK submit callback a shopper triggers and returns its emitted request.
    private func startShopperSubmit(
        _ adapter: CheckoutTurboModuleAdapter,
        events: @escaping () -> [NSDictionary]
    ) async throws -> ShopperSubmit {
        let eventCount = events().count
        let task = Task { await adapter.routeAdvancedSubmit(["paymentMethod": ["type": "scheme"]]) }
        let request = try await awaitRequest("advancedSubmit", after: eventCount, events: events)
        return ShopperSubmit(task: task, request: request)
    }

    private func awaitRequest(_ kind: String, after eventCount: Int, events: () -> [NSDictionary]) async throws -> NSDictionary {
        for _ in 0..<100 {
            if let request = events().dropFirst(eventCount).last(where: { $0["kind"] as? String == kind && $0["requestId"] != nil }) {
                return request
            }
            try await Task.sleep(for: .milliseconds(10))
        }
        throw TestError.timeout
    }

    private func respond(
        _ adapter: CheckoutTurboModuleAdapter,
        to request: NSDictionary,
        payloadJSON: String,
        overriding overrides: [String: Any] = [:],
        removing removals: [String] = []
    ) -> String? {
        let response = NSMutableDictionary(dictionary: request)
        response["payloadJson"] = payloadJSON
        overrides.forEach { response[$0.key] = $0.value }
        removals.forEach { response.removeObject(forKey: $0) }
        var rejection: String?
        adapter.respond(response, resolver: { _ in }) { code, _, _ in rejection = code }
        return rejection
    }

    private func waitUntil(_ description: String, _ condition: () -> Bool) async throws {
        for _ in 0..<100 {
            if condition() {
                return
            }
            try await Task.sleep(for: .milliseconds(10))
        }
        XCTFail("Timed out waiting for \(description)")
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

        func cleanups(of checkoutID: String) -> Int {
            events.events.filter { $0 == .cleanedUp(checkoutID: checkoutID) }.count
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
        private(set) var makeAttempts = 0
        private(set) var createdComponents: [(paymentMethod: CatalogPaymentMethod, component: FakeComponent)] = []
        var onDispose: (@MainActor () -> Void)?
        /// Replaces the default fake for components whose view controller access must be observed.
        var componentOverride: (@MainActor (CatalogPaymentMethod) -> PaymentComponentHandle?)?

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
            makeAttempts += 1
            if let override = componentOverride?(paymentMethod) {
                return override
            }
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
            onDispose?()
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
        var onDispose: (@MainActor (ComponentProxy) -> Void)?
        private(set) var disposals = 0

        func controllerDidDispose(_ controller: ComponentProxy) {
            disposals += 1
            ledger?.entries.append("controller-disposed")
            onDispose?(controller)
        }
    }

    /// Returns a fresh view controller on every access, like several SDK components do.
    @MainActor
    private final class FreshViewComponent: PaymentComponentHandle {
        private(set) var viewControllerAccesses = 0
        private(set) var submitCount = 0

        var viewController: UIViewController? {
            viewControllerAccesses += 1
            return UIViewController()
        }

        func submit() {
            submitCount += 1
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
        case timeout
    }
}

/// Names the coordinator error a synchronous command throws, or "ok" when it succeeds.
@MainActor
private func outcome(_ command: () throws -> Void) -> String {
    do {
        try command()
        return "ok"
    } catch let error as CoordinatorError {
        return "\(error)"
    } catch {
        return "\(error)"
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
