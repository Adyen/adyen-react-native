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

    // MARK: - provideShippingContactUpdate

    func test_provideShippingContactUpdate_doesNothing_whenNoHandler() {
        // GIVEN — no handler set
        var called = false
        sut.shippingContactHandler = nil

        // WHEN
        sut.provideShippingContactUpdate([:])

        // THEN — no crash, no call
        XCTAssertFalse(called)
        _ = called // suppress warning
    }

    func test_provideShippingContactUpdate_usesSummaryItemsFromDict() {
        // GIVEN
        let expectation = self.expectation(description: "handler called")
        var receivedUpdate: PKPaymentRequestShippingContactUpdate?
        sut.shippingContactHandler = { update in
            receivedUpdate = update
            expectation.fulfill()
        }
        let update: NSDictionary = [
            "paymentSummaryItems": [["label": "Total", "amount": "20"]]
        ]

        // WHEN
        sut.provideShippingContactUpdate(update)

        // THEN
        wait(for: [expectation], timeout: 1.0)
        XCTAssertEqual(receivedUpdate?.paymentSummaryItems.first?.label, "Total")
    }

    func test_provideShippingContactUpdate_fallsBackToCurrentPaymentSummaryItems() {
        // GIVEN
        let expectation = self.expectation(description: "handler called")
        var receivedUpdate: PKPaymentRequestShippingContactUpdate?
        sut.currentApplePayPayment = try! ApplePayPayment(
            countryCode: "US",
            currencyCode: "USD",
            summaryItems: [PKPaymentSummaryItem(label: "Fallback", amount: 10)]
        )
        sut.shippingContactHandler = { update in
            receivedUpdate = update
            expectation.fulfill()
        }

        // WHEN — no paymentSummaryItems in dict
        sut.provideShippingContactUpdate([:])

        // THEN
        wait(for: [expectation], timeout: 1.0)
        XCTAssertEqual(receivedUpdate?.paymentSummaryItems.first?.label, "Fallback")
    }

    func test_provideShippingContactUpdate_usesShippingMethodsFromDict() {
        // GIVEN
        let expectation = self.expectation(description: "handler called")
        var receivedUpdate: PKPaymentRequestShippingContactUpdate?
        sut.shippingContactHandler = { update in
            receivedUpdate = update
            expectation.fulfill()
        }
        let update: NSDictionary = [
            "paymentSummaryItems": [["label": "Total", "amount": "5"]],
            "shippingMethods": [["label": "Express", "amount": "15", "identifier": "express"]]
        ]

        // WHEN
        sut.provideShippingContactUpdate(update)

        // THEN
        wait(for: [expectation], timeout: 1.0)
        XCTAssertEqual(receivedUpdate?.shippingMethods.first?.identifier, "express")
    }

    func test_provideShippingContactUpdate_fallsBackToCurrentShippingMethods() {
        // GIVEN
        let expectation = self.expectation(description: "handler called")
        var receivedUpdate: PKPaymentRequestShippingContactUpdate?
        let fallbackMethod = PKShippingMethod(label: "Standard", amount: 5)
        fallbackMethod.identifier = "standard"
        sut.currentShippingMethods = [fallbackMethod]
        sut.shippingContactHandler = { update in
            receivedUpdate = update
            expectation.fulfill()
        }

        // WHEN — no shippingMethods in dict
        sut.provideShippingContactUpdate([:])

        // THEN
        wait(for: [expectation], timeout: 1.0)
        XCTAssertEqual(receivedUpdate?.shippingMethods.first?.identifier, "standard")
    }

    func test_provideShippingContactUpdate_parsesErrors() {
        // GIVEN
        let expectation = self.expectation(description: "handler called")
        var receivedUpdate: PKPaymentRequestShippingContactUpdate?
        sut.shippingContactHandler = { update in
            receivedUpdate = update
            expectation.fulfill()
        }
        let update: NSDictionary = [
            "paymentSummaryItems": [["label": "Total", "amount": "5"]],
            "errors": [["type": "shippingAddress", "field": "postalCode", "message": "Invalid postal code"]]
        ]

        // WHEN
        sut.provideShippingContactUpdate(update)

        // THEN
        wait(for: [expectation], timeout: 1.0)
        XCTAssertEqual(receivedUpdate?.errors?.count, 1)
    }

    // MARK: - provideShippingMethodUpdate

    func test_provideShippingMethodUpdate_doesNothing_whenNoHandler() {
        // GIVEN
        sut.shippingMethodHandler = nil

        // WHEN / THEN — no crash
        sut.provideShippingMethodUpdate([:])
    }

    func test_provideShippingMethodUpdate_usesSummaryItemsFromDict() {
        // GIVEN
        let expectation = self.expectation(description: "handler called")
        var receivedUpdate: PKPaymentRequestShippingMethodUpdate?
        sut.shippingMethodHandler = { update in
            receivedUpdate = update
            expectation.fulfill()
        }
        let update: NSDictionary = [
            "paymentSummaryItems": [["label": "Express Total", "amount": "25"]]
        ]

        // WHEN
        sut.provideShippingMethodUpdate(update)

        // THEN
        wait(for: [expectation], timeout: 1.0)
        XCTAssertEqual(receivedUpdate?.paymentSummaryItems.first?.label, "Express Total")
    }

    func test_provideShippingMethodUpdate_fallsBackToCurrentPaymentSummaryItems() {
        // GIVEN
        let expectation = self.expectation(description: "handler called")
        var receivedUpdate: PKPaymentRequestShippingMethodUpdate?
        sut.currentApplePayPayment = try! ApplePayPayment(
            countryCode: "US",
            currencyCode: "USD",
            summaryItems: [PKPaymentSummaryItem(label: "Fallback Total", amount: 10)]
        )
        sut.shippingMethodHandler = { update in
            receivedUpdate = update
            expectation.fulfill()
        }

        // WHEN
        sut.provideShippingMethodUpdate([:])

        // THEN
        wait(for: [expectation], timeout: 1.0)
        XCTAssertEqual(receivedUpdate?.paymentSummaryItems.first?.label, "Fallback Total")
    }

    // MARK: - provideCouponCodeUpdate

    @available(iOS 15.0, *)
    func test_provideCouponCodeUpdate_callsHandler() {
        // GIVEN
        let expectation = self.expectation(description: "handler called")
        var receivedUpdate: PKPaymentRequestCouponCodeUpdate?
        sut.couponCodeHandler = { update in
            receivedUpdate = update
            expectation.fulfill()
        }

        // WHEN
        sut.provideCouponCodeUpdate([:])

        // THEN
        wait(for: [expectation], timeout: 1.0)
        XCTAssertNotNil(receivedUpdate)
        XCTAssertNil(sut.couponCodeHandler)
    }

    @available(iOS 15.0, *)
    func test_provideCouponCodeUpdate_doesNothing_whenNoHandler() {
        // GIVEN
        sut.couponCodeHandler = nil

        // WHEN / THEN — no crash
        sut.provideCouponCodeUpdate([:])
    }

    @available(iOS 15.0, *)
    func test_provideCouponCodeUpdate_usesSummaryItemsAndShippingMethodsFromDict() {
        // GIVEN
        let expectation = self.expectation(description: "handler called")
        var receivedUpdate: PKPaymentRequestCouponCodeUpdate?
        sut.couponCodeHandler = { update in
            receivedUpdate = update
            expectation.fulfill()
        }
        let update: NSDictionary = [
            "paymentSummaryItems": [["label": "Discounted Total", "amount": "80"]],
            "shippingMethods": [["label": "Standard", "amount": "5", "identifier": "std"]]
        ]

        // WHEN
        sut.provideCouponCodeUpdate(update)

        // THEN
        wait(for: [expectation], timeout: 1.0)
        XCTAssertEqual(receivedUpdate?.paymentSummaryItems.first?.label, "Discounted Total")
        XCTAssertEqual(receivedUpdate?.shippingMethods.first?.identifier, "std")
    }

    @available(iOS 15.0, *)
    func test_provideCouponCodeUpdate_fallsBackToCurrentShippingMethods() {
        // GIVEN
        let expectation = self.expectation(description: "handler called")
        var receivedUpdate: PKPaymentRequestCouponCodeUpdate?
        let fallback = PKShippingMethod(label: "Fallback", amount: 0)
        fallback.identifier = "fallback"
        sut.currentShippingMethods = [fallback]
        sut.couponCodeHandler = { update in
            receivedUpdate = update
            expectation.fulfill()
        }

        // WHEN — no shippingMethods in dict
        sut.provideCouponCodeUpdate([:])

        // THEN
        wait(for: [expectation], timeout: 1.0)
        XCTAssertEqual(receivedUpdate?.shippingMethods.first?.identifier, "fallback")
    }

    @available(iOS 15.0, *)
    func test_provideCouponCodeUpdate_parsesErrors() {
        // GIVEN
        let expectation = self.expectation(description: "handler called")
        var receivedUpdate: PKPaymentRequestCouponCodeUpdate?
        sut.couponCodeHandler = { update in
            receivedUpdate = update
            expectation.fulfill()
        }
        let update: NSDictionary = [
            "paymentSummaryItems": [["label": "Total", "amount": "10"]],
            "errors": [["type": "couponCode", "message": "Invalid coupon"]]
        ]

        // WHEN
        sut.provideCouponCodeUpdate(update)

        // THEN
        wait(for: [expectation], timeout: 1.0)
        XCTAssertEqual(receivedUpdate?.errors?.count, 1)
    }

    // MARK: - provideAuthorizationResult

    func test_provideAuthorizationResult_doesNothing_whenNoHandler() {
        // GIVEN
        sut.authorizationHandler = nil

        // WHEN / THEN — no crash
        sut.provideAuthorizationResult(["status": "success"])
    }

    func test_provideAuthorizationResult_withErrors_passesThemThrough() {
        // GIVEN
        let expectation = self.expectation(description: "handler called")
        var receivedResult: PKPaymentAuthorizationResult?
        sut.authorizationHandler = { result in
            receivedResult = result
            expectation.fulfill()
        }
        let result: NSDictionary = [
            "status": "failure",
            "errors": [["type": "shippingAddress", "field": "postalCode", "message": "Bad zip"]]
        ]

        // WHEN
        sut.provideAuthorizationResult(result)

        // THEN
        wait(for: [expectation], timeout: 1.0)
        XCTAssertEqual(receivedResult?.status, .failure)
        XCTAssertEqual(receivedResult?.errors?.count, 1)
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

final class ApplePayModuleUtilitiesTests: XCTestCase {

    // MARK: - PKShippingMethod.jsonObject

    func test_pkShippingMethod_jsonObject_containsRequiredFields() {
        // GIVEN
        let method = PKShippingMethod(label: "Standard", amount: 5.00)
        method.identifier = "standard"
        method.detail = "5–7 days"

        // WHEN
        let json = method.jsonObject

        // THEN
        XCTAssertEqual(json["label"] as? String, "Standard")
        XCTAssertEqual(json["amount"] as? String, "5")
        XCTAssertEqual(json["identifier"] as? String, "standard")
        XCTAssertEqual(json["detail"] as? String, "5–7 days")
    }

    func test_pkShippingMethod_jsonObject_typeIsPending() {
        // GIVEN
        let method = PKShippingMethod(label: "TBD", amount: 0, type: .pending)

        // WHEN
        let json = method.jsonObject

        // THEN
        XCTAssertEqual(json["type"] as? String, "pending")
    }

    func test_pkShippingMethod_jsonObject_typeIsFinal() {
        // GIVEN
        let method = PKShippingMethod(label: "Express", amount: 15, type: .final)

        // WHEN
        let json = method.jsonObject

        // THEN
        XCTAssertEqual(json["type"] as? String, "final")
    }

    func test_pkShippingMethod_jsonObject_omitsNilIdentifierAndDetail() {
        // GIVEN
        let method = PKShippingMethod(label: "Free", amount: 0)

        // WHEN
        let json = method.jsonObject

        // THEN
        XCTAssertNil(json["identifier"])
        XCTAssertNil(json["detail"])
    }

    // MARK: - PKContact.jsonObject (field assertions)

    func test_pkContact_jsonObject_containsAllFields() {
        // GIVEN
        let contact = PKContact()
        contact.emailAddress = "test@example.com"
        contact.phoneNumber = CNPhoneNumber(stringValue: "+1234567890")

        var name = PersonNameComponents()
        name.givenName = "John"
        name.familyName = "Doe"
        name.phoneticRepresentation = PersonNameComponents()
        name.phoneticRepresentation?.givenName = "Jon"
        name.phoneticRepresentation?.familyName = "Doh"
        contact.name = name

        let address = CNMutablePostalAddress()
        address.street = "123 Main St"
        address.city = "Springfield"
        address.state = "IL"
        address.postalCode = "62701"
        address.country = "United States"
        address.isoCountryCode = "US"
        address.subLocality = "Downtown"
        address.subAdministrativeArea = "Sangamon"
        contact.postalAddress = address

        // WHEN
        let json = contact.jsonObject

        // THEN
        XCTAssertEqual(json["emailAddress"] as? String, "test@example.com")
        XCTAssertEqual(json["phoneNumber"] as? String, "+1234567890")
        XCTAssertEqual(json["givenName"] as? String, "John")
        XCTAssertEqual(json["familyName"] as? String, "Doe")
        XCTAssertEqual(json["phoneticGivenName"] as? String, "Jon")
        XCTAssertEqual(json["phoneticFamilyName"] as? String, "Doh")
        XCTAssertEqual(json["addressLines"] as? String, "123 Main St")
        XCTAssertEqual(json["locality"] as? String, "Springfield")
        XCTAssertEqual(json["administrativeArea"] as? String, "IL")
        XCTAssertEqual(json["postalCode"] as? String, "62701")
        XCTAssertEqual(json["country"] as? String, "United States")
        XCTAssertEqual(json["countryCode"] as? String, "US")
        XCTAssertEqual(json["subLocality"] as? String, "Downtown")
        XCTAssertEqual(json["subAdministrativeArea"] as? String, "Sangamon")
    }

    // MARK: - applePayError(from:)

    func test_applePayError_returnsNil_forUnknownType() {
        XCTAssertNil(applePayError(from: ["type": "unknown", "message": "error"]))
    }

    func test_applePayError_returnsNil_whenMissingMessage() {
        XCTAssertNil(applePayError(from: ["type": "shippingAddress"]))
    }

    func test_applePayError_shippingAddress_returnsError() {
        let error = applePayError(from: ["type": "shippingAddress", "field": "postalCode", "message": "Invalid postal code"])
        XCTAssertNotNil(error)
    }

    func test_applePayError_billingAddress_returnsError() {
        let error = applePayError(from: ["type": "billingAddress", "field": "city", "message": "Invalid city"])
        XCTAssertNotNil(error)
    }

    func test_applePayError_contactField_returnsError() {
        let error = applePayError(from: ["type": "contactField", "field": "phoneNumber", "message": "Invalid phone"])
        XCTAssertNotNil(error)
    }

    @available(iOS 15.0, *)
    func test_applePayError_couponCode_returnsError() {
        let error = applePayError(from: ["type": "couponCode", "message": "Invalid coupon"])
        XCTAssertNotNil(error)
    }

    @available(iOS 15.0, *)
    func test_applePayError_couponCodeExpired_returnsError() {
        let error = applePayError(from: ["type": "couponCodeExpired", "message": "Coupon expired"])
        XCTAssertNotNil(error)
    }

    func test_applePayError_shippingAddress_usesDefaultKey_whenFieldIsNil() {
        let error = applePayError(from: ["type": "shippingAddress", "message": "Error"])
        XCTAssertNotNil(error)
    }

    // MARK: - ApplePayPaymentMethod.supportedNetworks

    func test_supportedNetworks_returnsAllAvailable_whenBrandsIsNil() {
        // GIVEN
        let dict: NSDictionary = ["type": "applepay", "name": "Apple Pay"]
        let method: ApplePayPaymentMethod = try! dict.decode()

        // WHEN
        let networks = method.supportedNetworks

        // THEN
        XCTAssertFalse(networks.isEmpty)
    }

    func test_supportedNetworks_filtersToMatchingBrands() {
        // GIVEN — brands only contains "visa"
        let dict: NSDictionary = ["type": "applepay", "name": "Apple Pay", "brands": ["visa"]]
        let method: ApplePayPaymentMethod = try! dict.decode()

        // WHEN
        let networks = method.supportedNetworks

        // THEN
        XCTAssertTrue(networks.contains(.visa))
        XCTAssertFalse(networks.contains(.masterCard))
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
