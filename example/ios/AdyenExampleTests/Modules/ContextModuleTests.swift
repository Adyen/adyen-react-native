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

    func test_cancelApplePayCallbacks_resolvesAndClearsPendingHandlers() {
        let authorizationExpectation = expectation(description: "authorization handler")
        let shippingContactExpectation = expectation(description: "shipping contact handler")
        let shippingMethodExpectation = expectation(description: "shipping method handler")

        sut.authorizationHandler = { result in
            XCTAssertEqual(result.status, .failure)
            authorizationExpectation.fulfill()
        }
        sut.shippingContactHandler = { _ in shippingContactExpectation.fulfill() }
        sut.shippingMethodHandler = { _ in shippingMethodExpectation.fulfill() }

        sut.cancelApplePayCallbacks()

        wait(for: [authorizationExpectation, shippingContactExpectation, shippingMethodExpectation], timeout: 1)
        XCTAssertNil(sut.authorizationHandler)
        XCTAssertNil(sut.shippingContactHandler)
        XCTAssertNil(sut.shippingMethodHandler)
    }

    @available(iOS 15.0, *)
    func test_cancelApplePayCallbacks_resolvesAndClearsPendingCouponHandler() {
        let expectation = expectation(description: "coupon code handler")
        sut.couponCodeHandler = { _ in expectation.fulfill() }

        sut.cancelApplePayCallbacks()

        wait(for: [expectation], timeout: 1)
        XCTAssertNil(sut.couponCodeHandler)
    }
}
