//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

@testable import adyen_react_native
import PassKit
import XCTest

/// Exercises the routers that the generated TurboModule's real SDK closures call. These are not
/// coordinator-only vectors: each request is emitted by the adapter and settled through `respond`.
@MainActor
final class ProductionCallbackRouterTests: XCTestCase {
    private var observedRequestIDs: Set<String> = []

    func test_sessionRouterCorrelatesProceedAndAbortThenEmitsOneTerminal() async throws {
        let fixture = Fixture()
        let coordinator = fixture.coordinator()
        let adapter = CheckoutTurboModuleAdapter(coordinator: coordinator) { checkoutID in
            try coordinator.assertDropInAvailability(checkoutID: checkoutID)
        }
        var events: [NSDictionary] = []
        adapter.setEventSink { events.append($0) }
        let checkoutID = try await coordinator.setup()

        let proceed = Task { await adapter.routeSessionBeforeSubmit(["shopperEmail": "shopper@example.test"]) }
        await waitForPendingResponse(adapter)
        let request = try await nextRequest(from: &events)
        XCTAssertEqual(request["kind"] as? String, "sessionBeforeSubmit")
        XCTAssertEqual(request["checkoutId"] as? String, checkoutID)

        XCTAssertEqual(
            respond(adapter, to: request, payload: ["type": "proceed", "data": [:]]),
            nil
        )
        let proceedPayload = await proceed.value
        XCTAssertEqual(proceedPayload?["type"] as? String, "proceed")

        let abort = Task { await adapter.routeSessionBeforeSubmit([:]) }
        await waitForPendingResponse(adapter)
        let abortRequest = try await nextRequest(from: &events)
        var staleTuple = abortRequest.mutableCopy() as! NSMutableDictionary
        staleTuple["operationId"] = "stale-operation"
        XCTAssertEqual(respond(adapter, to: staleTuple, payload: ["type": "abort"]), "staleRequest")
        XCTAssertEqual(respond(adapter, to: abortRequest, payload: ["type": "abort"]), nil)
        let abortPayload = await abort.value
        XCTAssertEqual(abortPayload?["type"] as? String, "abort")

        adapter.routeTerminal(kind: "completion", payload: ["resultCode": "Authorised", "sessionId": "session"])
        adapter.routeTerminal(kind: "error", payload: ["message": "must not emit"])
        await settleTasks()

        XCTAssertEqual(events.compactMap { $0["kind"] as? String }.filter { $0 == "completion" || $0 == "error" }, ["completion"])
        XCTAssertNil(coordinator.checkoutID)
    }

    func test_advancedRouterRetriesCompetingCallbacksAndRetainsActionAndDetailsOwnership() async throws {
        let fixture = Fixture()
        let coordinator = fixture.coordinator()
        let adapter = CheckoutTurboModuleAdapter(coordinator: coordinator) { checkoutID in
            try coordinator.assertDropInAvailability(checkoutID: checkoutID)
        }
        var events: [NSDictionary] = []
        adapter.setEventSink { events.append($0) }
        let checkoutID = try await coordinator.setup()

        let action = Task { await adapter.routeAdvancedSubmit(["paymentMethod": ["type": "scheme"]]) }
        await waitForPendingResponse(adapter)
        let request = try await nextRequest(from: &events)
        XCTAssertEqual(request["kind"] as? String, "advancedSubmit")
        XCTAssertEqual(coordinator.operationID, request["operationId"] as? String)

        let competing = await adapter.routeAdvancedSubmit(["paymentMethod": ["type": "scheme"]])
        guard case .retry = competing else {
            return XCTFail("A competing embedded callback must receive a native retry")
        }
        XCTAssertEqual(events.count, 1)
        XCTAssertEqual(fixture.assertions, ["Competing embedded checkout callback"])

        XCTAssertEqual(
            respond(
                adapter,
                to: request,
                payload: [
                    "type": "action",
                    "action": [
                        "type": "redirect",
                        "paymentMethodType": "scheme",
                        "url": "https://example.test"
                    ]
                ]
            ),
            nil
        )
        guard case .action = await action.value else {
            return XCTFail("The active request must retain an action result")
        }
        let operationID = try XCTUnwrap(coordinator.operationID)

        let details = Task { await adapter.routeAdvancedAdditionalDetails(["details": [:]]) }
        await waitForPendingResponse(adapter)
        let detailsRequest = try await nextRequest(from: &events)
        XCTAssertEqual(respond(adapter, to: detailsRequest, payload: ["resultCode": "Authorised"]), nil)
        guard case .completion = await details.value else {
            return XCTFail("Additional details must normalize its completion")
        }
        XCTAssertEqual(coordinator.operationID, operationID)

        adapter.routeTerminal(kind: "completion", payload: ["resultCode": "Authorised"])
        await settleTasks()
        XCTAssertNil(coordinator.checkoutID)

        _ = try await coordinator.setup()
        let malformedResult = Task { await adapter.routeAdvancedSubmit(["paymentMethod": ["type": "scheme"]]) }
        await waitForPendingResponse(adapter)
        let malformedRequest = try await nextRequest(from: &events)
        var malformed = malformedRequest.mutableCopy() as! NSMutableDictionary
        malformed["payloadJson"] = "{"
        XCTAssertEqual(respond(adapter, to: malformed, payload: nil), "staleRequest")
        guard case .completion = await malformedResult.value else {
            return XCTFail("A malformed result must use the native error completion")
        }
        adapter.routeTerminal(kind: "error", payload: ["message": "malformed"])
        await settleTasks()

        let retryCheckoutID = try await coordinator.setup()
        let retry = Task { await adapter.routeAdvancedSubmit(["paymentMethod": ["type": "scheme"]]) }
        await waitForPendingResponse(adapter)
        let retryRequest = try await nextRequest(from: &events)
        var stale = retryRequest.mutableCopy() as! NSMutableDictionary
        stale["requestId"] = "stale-request"
        XCTAssertEqual(respond(adapter, to: stale, payload: ["type": "retry"]), "staleRequest")
        XCTAssertEqual(respond(adapter, to: retryRequest, payload: ["type": "retry"]), nil)
        guard case .retry = await retry.value else {
            return XCTFail("A matching retry must normalize")
        }
        XCTAssertNil(coordinator.operationID)
        XCTAssertTrue(coordinator.isActive(checkoutID: retryCheckoutID))

        XCTAssertNoThrow(try adapter.routeHeadlessSubmit { FixturePresenter() })
        coordinator.completeOperation(try XCTUnwrap(coordinator.operationID))
        _ = coordinator.acquireInitialEmbeddedOperation(checkoutID: retryCheckoutID)
        XCTAssertThrowsError(try adapter.routeHeadlessSubmit { FixturePresenter() }) { error in
            XCTAssertEqual(error as? CoordinatorError, .operationBusy)
        }
        XCTAssertThrowsError(try coordinator.assertDropInAvailability(checkoutID: retryCheckoutID)) { error in
            XCTAssertEqual(error as? CoordinatorError, .operationBusy)
        }
    }

    func test_applePayRoutersSettleEachGeneratedKindOnceWithFallbackAndStaleCoverage() async throws {
        let fixture = Fixture()
        let coordinator = fixture.coordinator()
        let adapter = CheckoutTurboModuleAdapter(coordinator: coordinator) { checkoutID in
            try coordinator.assertDropInAvailability(checkoutID: checkoutID)
        }
        var events: [NSDictionary] = []
        adapter.setEventSink { events.append($0) }
        let checkoutID = try await coordinator.setup()
        _ = coordinator.acquireInitialEmbeddedOperation(checkoutID: checkoutID)
        let summary = [PKPaymentSummaryItem(label: "Total", amount: 1)]

        let routers: [(String, () async -> Void, [String: Any])] = [
            ("applePayAuthorization", { _ = await adapter.routeApplePayAuthorization([:]) }, ["status": "success"]),
            ("applePayShippingContact", { _ = await adapter.routeApplePayShippingContact([:], summaryItems: summary) }, [:]),
            ("applePayShippingMethod", { _ = await adapter.routeApplePayShippingMethod([:], summaryItems: summary) }, [:]),
            ("applePayCouponCode", { _ = await adapter.routeApplePayCouponCode("SAVE", summaryItems: summary) }, [:])
        ]

        for (kind, router, payload) in routers {
            let task = Task { await router() }
            await waitForPendingResponse(adapter)
            let request = try await nextRequest(from: &events)
            XCTAssertEqual(request["kind"] as? String, kind)
            XCTAssertEqual(respond(adapter, to: request, payload: payload), nil)
            await task.value
            XCTAssertEqual(respond(adapter, to: request, payload: payload), "staleRequest")
        }

        let fallback = Task { await adapter.routeApplePayCouponCode("FALLBACK", summaryItems: summary) }
        await waitForPendingResponse(adapter)
        let fallbackRequest = try await nextRequest(from: &events)
        var invalidJSON = fallbackRequest.mutableCopy() as! NSMutableDictionary
        invalidJSON["payloadJson"] = "{"
        XCTAssertEqual(respond(adapter, to: invalidJSON, payload: nil), "staleRequest")
        _ = await fallback.value
    }

    private func nextRequest(from events: inout [NSDictionary]) async throws -> NSDictionary {
        for _ in 0 ..< 100 {
            if let event = events.last,
               let requestID = event["requestId"] as? String,
               observedRequestIDs.insert(requestID).inserted
            {
                return event
            }
            try? await Task.sleep(for: .milliseconds(10))
        }
        throw TestError.timeout
    }

    private func respond(
        _ adapter: CheckoutTurboModuleAdapter,
        to request: NSDictionary,
        payload: [String: Any]?
    ) -> String? {
        let response = request.mutableCopy() as! NSMutableDictionary
        if let payload {
            let data = try? JSONSerialization.data(withJSONObject: payload)
            response["payloadJson"] = data.map { String(decoding: $0, as: UTF8.self) }
        }
        var rejectionCode: String?
        adapter.respond(response, resolver: { _ in }) { code, _, _ in
            rejectionCode = code
        }
        return rejectionCode
    }

    private func settleTasks() async {
        for _ in 0 ..< 10 {
            await Task.yield()
        }
    }

    private func waitForPendingResponse(_ adapter: CheckoutTurboModuleAdapter) async {
        while adapter.pendingResponseCount == 0 {
            await Task.yield()
        }
    }
}

@MainActor
private extension ProductionCallbackRouterTests {
    @MainActor
    final class Fixture {
        private(set) var assertions: [String] = []

        func coordinator() -> CheckoutCoordinator {
            CheckoutCoordinator(
                dependencies: .init(
                    checkoutFactory: FixtureFactory(),
                    presenterFactory: FixturePresenterFactory(),
                    eventSink: FixtureEventSink(),
                    identityGenerator: FixtureIdentityGenerator(),
                    scheduler: FixtureScheduler(),
                    hostAdapter: FixtureHost()
                ),
                debugAssertionReporter: { [weak self] message in
                    self?.assertions.append(message)
                }
            )
        }
    }

    @MainActor
    final class FixtureFlow: CoordinatorCheckout {
        var checkoutState: CheckoutState? { nil }
        func dispose() {}
    }

    @MainActor
    final class FixtureFactory: CheckoutFactory {
        func makeCheckout() async throws -> CoordinatorCheckout { FixtureFlow() }
    }

    @MainActor
    final class FixturePresenterFactory: PresenterFactory {
        func makePresenter() -> CoordinatorPresenter { FixturePresenter() }
    }

    @MainActor
    final class FixturePresenter: CoordinatorPresenter {
        func dispose() {}
    }

    @MainActor
    final class FixtureEventSink: CheckoutEventSink {
        func emit(_: CoordinatorEvent) {}
    }

    @MainActor
    final class FixtureIdentityGenerator: CheckoutIdentityGenerator {
        private var values: [CoordinatorIdentityKind: Int] = [:]

        func nextID(for kind: CoordinatorIdentityKind) -> String {
            values[kind, default: 0] += 1
            return "\(kind)-\(values[kind]!)"
        }
    }

    @MainActor
    final class FixtureScheduler: CheckoutScheduler {
        func schedule(after _: TimeInterval, action _: @escaping @MainActor () -> Void) -> CoordinatorCancellation {
            FixtureCancellation()
        }
    }

    @MainActor
    final class FixtureCancellation: CoordinatorCancellation {
        func cancel() {}
    }

    @MainActor
    final class FixtureHost: CheckoutHostAdapter {
        func releaseCheckoutHost() async {}
    }

    enum TestError: Error {
        case timeout
    }
}
