//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

@testable import adyen_react_native
import PassKit
import XCTest

/// The Apple Pay handlers and `cancelApplePayCallbacks()` are main-actor isolated on
/// ContextModule, so the whole test case runs on the main actor.
@MainActor
final class ContextModuleTests: XCTestCase {

    private var sut: ContextModule!

    override func setUp() {
        super.setUp()
        sut = ContextModule()
    }

    override func tearDown() {
        sut = nil
        super.tearDown()
    }

    func test_cancelApplePayCallbacks_settlesSuspendedAuthorization() async {
        // GIVEN an authorization call suspended awaiting a response from JS
        let suspended = Task {
            await sut.authorizationBridge.suspend(superseding: .init(status: .failure, errors: nil)) {}
        }
        while !sut.authorizationBridge.isAwaiting {
            await Task.yield()
        }

        // WHEN the flow is torn down
        sut.cancelApplePayCallbacks()

        // THEN the suspended call is settled as a failure rather than left to leak
        let result = await suspended.value
        XCTAssertEqual(result.status, .failure)
        XCTAssertFalse(sut.authorizationBridge.isAwaiting)
    }

    func test_cancelApplePayCallbacks_settlesSuspendedShippingAndCouponCalls() async {
        // GIVEN the shipping and coupon callbacks all suspended
        let contact = Task {
            await sut.shippingContactBridge.suspend(superseding: .init(paymentSummaryItems: [])) {}
        }
        let method = Task {
            await sut.shippingMethodBridge.suspend(superseding: .init(paymentSummaryItems: [])) {}
        }
        let coupon = Task {
            await sut.couponCodeBridge.suspend(superseding: .init(paymentSummaryItems: [])) {}
        }
        while !(sut.shippingContactBridge.isAwaiting
            && sut.shippingMethodBridge.isAwaiting
            && sut.couponCodeBridge.isAwaiting) {
            await Task.yield()
        }

        // WHEN the flow is torn down
        sut.cancelApplePayCallbacks()

        // THEN every suspended call is settled, so none of them leaks a continuation
        _ = await contact.value
        _ = await method.value
        _ = await coupon.value
        XCTAssertFalse(sut.shippingContactBridge.isAwaiting)
        XCTAssertFalse(sut.shippingMethodBridge.isAwaiting)
        XCTAssertFalse(sut.couponCodeBridge.isAwaiting)
    }
}
