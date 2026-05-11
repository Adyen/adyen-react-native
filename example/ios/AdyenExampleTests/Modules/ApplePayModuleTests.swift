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

    func test_isAvailable_returnsTrue_whenCanMakePaymentsAndHasAuthorizationViewController() {
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

    func test_isAvailable_returnsFalse_whenNoAmount() {
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

    func test_isAvailable_returnsFalse_whenHasNoAuthorizationViewController() {
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

    func test_isAvailable_returnsFalse_whenCanMakePaymentsIsFalse() {
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

    // MARK: - provideAuthorizationResult

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

    // MARK: - provideShippingContactUpdate

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

    func test_provideShippingContactUpdate_doesNothing_whenNoHandler() {
        // GIVEN
        sut.shippingContactHandler = nil

        // WHEN / THEN — no crash
        sut.provideShippingContactUpdate([:])
    }

    func test_provideShippingContactUpdate_usesSummaryItemsFromDict() {
        // GIVEN
        let expectation = self.expectation(description: "handler called")
        var receivedUpdate: PKPaymentRequestShippingContactUpdate?
        sut.shippingContactHandler = { update in
            receivedUpdate = update
            expectation.fulfill()
        }

        // WHEN
        sut.provideShippingContactUpdate(["paymentSummaryItems": [["label": "Total", "amount": "20"]]])

        // THEN
        wait(for: [expectation], timeout: 1.0)
        XCTAssertEqual(receivedUpdate?.paymentSummaryItems.first?.label, "Total")
    }

    func test_provideShippingContactUpdate_fallsBackToCurrentPaymentSummaryItems() throws {
        // GIVEN
        let expectation = self.expectation(description: "handler called")
        var receivedUpdate: PKPaymentRequestShippingContactUpdate?
        sut.currentApplePayPayment = try ApplePayPayment(
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

    func test_provideShippingContactUpdate_allowsEmptyShippingMethods() {
        // GIVEN
        let expectation = self.expectation(description: "handler called")
        var receivedUpdate: PKPaymentRequestShippingContactUpdate?
        let fallback = PKShippingMethod(label: "Standard", amount: 5)
        sut.currentShippingMethods = [fallback]
        sut.shippingContactHandler = { update in
            receivedUpdate = update
            expectation.fulfill()
        }

        // WHEN — explicit empty array should clear methods, not fall back
        sut.provideShippingContactUpdate(["paymentSummaryItems": [["label": "Total", "amount": "5"]], "shippingMethods": []])

        // THEN
        wait(for: [expectation], timeout: 1.0)
        XCTAssertEqual(receivedUpdate?.shippingMethods.count, 0)
    }

    func test_provideShippingContactUpdate_fallsBackToCurrentShippingMethods() {
        // GIVEN
        let expectation = self.expectation(description: "handler called")
        var receivedUpdate: PKPaymentRequestShippingContactUpdate?
        let fallback = PKShippingMethod(label: "Standard", amount: 5)
        fallback.identifier = "standard"
        sut.currentShippingMethods = [fallback]
        sut.shippingContactHandler = { update in
            receivedUpdate = update
            expectation.fulfill()
        }

        // WHEN — no shippingMethods key in dict
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

        // WHEN
        sut.provideShippingMethodUpdate(["paymentSummaryItems": [["label": "Express Total", "amount": "25"]]])

        // THEN
        wait(for: [expectation], timeout: 1.0)
        XCTAssertEqual(receivedUpdate?.paymentSummaryItems.first?.label, "Express Total")
    }

    func test_provideShippingMethodUpdate_fallsBackToCurrentPaymentSummaryItems() throws {
        // GIVEN
        let expectation = self.expectation(description: "handler called")
        var receivedUpdate: PKPaymentRequestShippingMethodUpdate?
        sut.currentApplePayPayment = try ApplePayPayment(
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

    func test_cleanUp_clearsAuthorizationHandler() {
        // GIVEN
        sut.authorizationHandler = { _ in }

        // WHEN
        sut.cleanUp()

        // THEN
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

    @available(iOS 15.0, *)
    func test_pkShippingMethod_jsonObject_includesDateRange() {
        // GIVEN
        let method = PKShippingMethod(label: "Standard", amount: 5)
        let start = DateComponents(year: 2026, month: 6, day: 1)
        let end = DateComponents(year: 2026, month: 6, day: 5)
        method.dateComponentsRange = PKDateComponentsRange(start: start, end: end)

        // WHEN
        let json = method.jsonObject

        // THEN
        XCTAssertNotNil(json["startDate"])
        XCTAssertNotNil(json["endDate"])
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

    func test_applePayError_shippingAddress_usesDefaultKey_whenFieldIsNil() {
        let error = applePayError(from: ["type": "shippingAddress", "message": "Error"])
        XCTAssertNotNil(error)
    }

    func test_applePayError_shippingAddress_allPostalAddressFields() {
        let fields = [
            "street", "addressLines",
            "city", "locality",
            "state", "administrativeArea",
            "postalCode",
            "country",
            "countryCode",
            "subLocality",
            "subAdministrativeArea",
            "unknownField"
        ]
        for field in fields {
            let error = applePayError(from: ["type": "shippingAddress", "field": field, "message": "Error"])
            XCTAssertNotNil(error, "Expected non-nil error for field '\(field)'")
        }
    }

    // MARK: - ApplePayPaymentMethod.supportedNetworks

    func test_supportedNetworks_returnsAllAvailable_whenBrandsIsNil() throws {
        // GIVEN
        let dict: NSDictionary = ["type": "applepay", "name": "Apple Pay"]
        let method: ApplePayPaymentMethod = try dict.decode()

        // WHEN
        let networks = method.supportedNetworks

        // THEN
        XCTAssertFalse(networks.isEmpty)
    }

    func test_supportedNetworks_filtersToMatchingBrands() throws {
        // GIVEN
        let dict: NSDictionary = ["type": "applepay", "name": "Apple Pay", "brands": ["visa"]]
        let method: ApplePayPaymentMethod = try dict.decode()

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
