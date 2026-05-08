//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import XCTest
@_spi(AdyenInternal) import Adyen
@testable import adyen_react_native
import Contacts
import PassKit

let mockApplePaymentMethod: ApplePayPaymentMethod = try! applePayDictionary.decode()

var mockPaymentRequest: PKPaymentRequest {
    let paymentRequest = PKPaymentRequest()
    paymentRequest.supportedNetworks = [.visa, .masterCard]
    paymentRequest.countryCode = "US"
    paymentRequest.currencyCode = "USD"
    paymentRequest.merchantIdentifier = "merchant.com.test"
    paymentRequest.paymentSummaryItems = [.init(label: "total", amount: 10)]
    paymentRequest.merchantCapabilities = [.threeDSecure]
    return paymentRequest
}

final class ApplePayModuleTests: XCTestCase {

    var sut: ApplePayModule!
    fileprivate var mockPaymentAuthorizationService: MockPKPaymentAuthorizationService!

    override func setUp() {
        super.setUp()
        mockPaymentAuthorizationService = MockPKPaymentAuthorizationService()
        sut = ApplePayModule(pkPaymentAuthorizationService: mockPaymentAuthorizationService)
    }

    override func tearDown() {
        sut = nil
        mockPaymentAuthorizationService = nil
        super.tearDown()
    }

    func test_isAvailable_returnsTrue_whenCanMakePaymentsAndHasAuthorizationViewController() throws {
        // GIVEN
        mockPaymentAuthorizationService.authorizationViewControllerResult = PKPaymentAuthorizationViewController(paymentRequest: mockPaymentRequest)

        // WHEN
        sut.isAvailable(applePayDictionary, configuration: configuration) { resolve in
            // THEN
            let isSuccess = try! XCTUnwrap(resolve as? Bool)
            XCTAssertTrue(isSuccess)
        } rejecter: { title, message, error in
            XCTFail("Should not throw error")
        }
    }

    func test_isAvailable_returnsFalse_whenNoAmount() throws {
        // GIVEN
        mockPaymentAuthorizationService.canMakePaymentsResult = true
        let sut = ApplePayModule(pkPaymentAuthorizationService: mockPaymentAuthorizationService)
        let configuration: NSDictionary = [
            "clientKey": "test_client_key",
            "countryCode": "US",
            "applepay": [
                "merchantID": "merchant.com.adyen.test",
                "merchantName": "Test Merchant"
            ]
        ]

        // WHEN
        sut.isAvailable(applePayDictionary, configuration: configuration) { resolve in
            // THEN
            let isSuccess = try! XCTUnwrap(resolve as? Bool)
            XCTAssertFalse(isSuccess)
        } rejecter: { title, message, error in
            XCTFail("Should not throw error")
        }
    }

    func test_isAvailable_returnsFalse_whenHasNoAuthorizationViewController() throws {
        // GIVEN
        mockPaymentAuthorizationService.canMakePaymentsResult = true
        let sut = ApplePayModule(pkPaymentAuthorizationService: mockPaymentAuthorizationService)

        // WHEN
        sut.isAvailable(applePayDictionary, configuration: configuration) { resolve in
            // THEN
            let isSuccess = try! XCTUnwrap(resolve as? Bool)
            XCTAssertFalse(isSuccess)
        } rejecter: { title, message, error in
            XCTFail("Should not throw error")
        }
    }

    func test_isAvailable_returnsFalse_whenCanMakePaymentsIsFalse() throws {
        // GIVEN
        mockPaymentAuthorizationService.canMakePaymentsResult = false
        let sut = ApplePayModule(pkPaymentAuthorizationService: mockPaymentAuthorizationService)

        // WHEN
        sut.isAvailable(applePayDictionary, configuration: configuration) { resolve in
            // THEN
            let isSuccess = try! XCTUnwrap(resolve as? Bool)
            XCTAssertFalse(isSuccess)
        } rejecter: { title, message, error in
            XCTFail("Should not throw error")
        }
    }

    func test_applePayDetails_hasExtraData() {
        // GIVEN
        let mockApplePayDetails = ApplePayDetails(
            paymentMethod: mockApplePaymentMethod,
            token: "",
            network: "visa",
            billingContact: PKContact(),
            shippingContact: nil,
            shippingMethod: .init(label: "Cargo", amount: 10, type: .final)
        )
        
        // WHEN
        let extraData = mockApplePayDetails.extraData
        
        // THEN
        XCTAssertNotNil(extraData)
    }

    func test_pkContact_providesJsonObject() {
        // GIVEN
        let contact = PKContact()
        contact.emailAddress = "test@example.com"
        contact.phoneNumber = CNPhoneNumber(stringValue: "+1234567890")

        var name = PersonNameComponents()
        name.givenName = "John"
        name.familyName = "Doe"
        contact.name = name

        // WHEN
        let jsonObject = contact.jsonObject

        // THEN
        XCTAssertNotNil(jsonObject)
    }

    func test_pkPaymentNetwork_hasTxVariantName() {
        // GIVEN
        let networks = [
            PKPaymentNetwork.masterCard,
            PKPaymentNetwork.cartesBancaires,
            PKPaymentNetwork.visa,
            PKPaymentNetwork.amex
        ]
        
        // WHEN/THEN
        XCTAssertEqual(networks[0].txVariantName, "mc")
        XCTAssertEqual(networks[1].txVariantName, "cartebancaire")
        XCTAssertEqual(networks[2].txVariantName, "visa")
        XCTAssertEqual(networks[3].txVariantName, "amex")
    }

    func test_pkPaymentAuthorizationServiceAdapter_providesPaymentServices() {
        // GIVEN
        let adapter = PKPaymentAuthorizationServiceAdapter()

        // WHEN
        let canMakePayments = adapter.canMakePayments(usingNetworks: [.visa, .masterCard])
        let viewController = adapter.getAuthorizationViewController(paymentRequest: mockPaymentRequest)

        // THEN
        // These methods delegate to the real PKPaymentAuthorizationViewController
        // so we can't easily test the exact behavior without mocking the static methods
        // But we can at least test that the methods don't crash and return expected types
        XCTAssertNotNil(viewController)
        XCTAssertTrue(canMakePayments)
    }

    func test_provideShippingContactUpdate_callsHandler() {
        // GIVEN
        let expectation = self.expectation(description: "handler should be called")
        var receivedUpdate: PKPaymentRequestShippingContactUpdate?
        sut.shippingContactHandler = { update in
            receivedUpdate = update
            expectation.fulfill()
        }

        // WHEN
        sut.provideShippingContactUpdate([:])

        // THEN
        wait(for: [expectation], timeout: 1.0)
        XCTAssertNotNil(receivedUpdate)
        XCTAssertNil(sut.shippingContactHandler)
    }

    func test_provideShippingMethodUpdate_callsHandler() {
        // GIVEN
        let expectation = self.expectation(description: "handler should be called")
        var receivedUpdate: PKPaymentRequestShippingMethodUpdate?
        sut.shippingMethodHandler = { update in
            receivedUpdate = update
            expectation.fulfill()
        }

        // WHEN
        sut.provideShippingMethodUpdate([:])

        // THEN
        wait(for: [expectation], timeout: 1.0)
        XCTAssertNotNil(receivedUpdate)
        XCTAssertNil(sut.shippingMethodHandler)
    }

    func test_provideAuthorizationResult_callsHandlerWithSuccess() {
        // GIVEN
        let expectation = self.expectation(description: "handler should be called")
        var receivedResult: PKPaymentAuthorizationResult?
        sut.authorizationHandler = { result in
            receivedResult = result
            expectation.fulfill()
        }

        // WHEN
        sut.provideAuthorizationResult(["status": "success"])

        // THEN
        wait(for: [expectation], timeout: 1.0)
        XCTAssertEqual(receivedResult?.status, .success)
        XCTAssertNil(sut.authorizationHandler)
    }

    func test_provideAuthorizationResult_callsHandlerWithFailure() {
        // GIVEN
        let expectation = self.expectation(description: "handler should be called")
        var receivedResult: PKPaymentAuthorizationResult?
        sut.authorizationHandler = { result in
            receivedResult = result
            expectation.fulfill()
        }

        // WHEN
        sut.provideAuthorizationResult(["status": "failure"])

        // THEN
        wait(for: [expectation], timeout: 1.0)
        XCTAssertEqual(receivedResult?.status, .failure)
    }

    func test_cleanUp_clearsAllHandlers() {
        // GIVEN
        sut.shippingContactHandler = { _ in }
        sut.shippingMethodHandler = { _ in }
        sut.authorizationHandler = { _ in }

        // WHEN
        sut.cleanUp()

        // THEN
        XCTAssertNil(sut.shippingContactHandler)
        XCTAssertNil(sut.shippingMethodHandler)
        XCTAssertNil(sut.authorizationHandler)
    }

    func test_hide_callsDismiss() {
        // GIVEN
        let expectation = self.expectation(description: "dismiss should be called")
        let testModule = TestableApplePayModule(pkPaymentAuthorizationService: mockPaymentAuthorizationService)

        // WHEN
        testModule.hide(NSNumber(value: true), event: NSDictionary())

        // THEN
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {

            XCTAssertTrue(testModule.dismissCalled)
            XCTAssertTrue(testModule.dismissSuccessValue)
            expectation.fulfill()
        }
        wait(for: [expectation], timeout: 1.0)
    }
}

private class TestableApplePayModule: ApplePayModule {
    var dismissCalled = false
    var dismissSuccessValue = false

    override func dismiss(_ result: Bool) {
        dismissCalled = true
        dismissSuccessValue = result
    }
}

private class MockPKPaymentAuthorizationService: PKPaymentAuthorizationService {
    var canMakePaymentsResult = true
    var authorizationViewControllerResult: PKPaymentAuthorizationViewController?

    func canMakePayments(usingNetworks networks: [PKPaymentNetwork]) -> Bool {
        canMakePaymentsResult
    }

    func getAuthorizationViewController(paymentRequest: PKPaymentRequest) -> PKPaymentAuthorizationViewController? {
        authorizationViewControllerResult
    }
}
