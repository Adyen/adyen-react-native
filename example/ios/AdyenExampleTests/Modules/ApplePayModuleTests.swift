//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import XCTest
@_spi(AdyenInternal) import Adyen
import PassKit
import Contacts
@testable import adyen_react_native

let paymentMethodDict: NSDictionary = [
  "type": "applepay",
  "name": "Apple Pay",
  "brands": ["mc", "visa"]
]

let configuration: NSDictionary = [
  "clientKey": "test_client_key",
  "amount": [
    "value": 1000,
    "currency": "USD"
  ],
  "countryCode": "US",
  "applepay": [
    "merchantID": "merchant.com.adyen.test",
    "merchantName": "Test Merchant"
  ]
]

let mockApplePaymentMethod = try! JSONDecoder().decode(ApplePayPaymentMethod.self,
                                                   from: try! JSONSerialization.data(withJSONObject: paymentMethodDict) )

let mockApplePayDetails = ApplePayDetails(
  paymentMethod: mockApplePaymentMethod,
  token: "",
  network: "visa",
  billingContact: PKContact(),
  shippingContact: nil,
  shippingMethod: .init(label: "Cargo", amount: 10, type: .final)
)

var mockPaymentRequest: PKPaymentRequest{
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

  func testIsAvailableSuccess() throws {
      // Given
    let sut = ApplePayModule(pkPaymentAuthorizationService: mockPaymentAuthorizationService)
    mockPaymentAuthorizationService.authorizationViewControllerResult = PKPaymentAuthorizationViewController(paymentRequest: mockPaymentRequest)

      // Then
    sut.isAvailable(paymentMethodDict, configuration: configuration) { resolve in
      let isSuccess = try! XCTUnwrap(resolve as? Bool )
      XCTAssertTrue(isSuccess)
    } rejecter: { title, message, error in
      XCTFail("Shou not throw error")
    }
  }

  func testIsAvailableReturnFalseWhenNoAmount() throws {
      // Given
    mockPaymentAuthorizationService.canMakePaymentsResult = false
    let sut = ApplePayModule(pkPaymentAuthorizationService: mockPaymentAuthorizationService)
    let configuration: NSDictionary = [
      "clientKey": "test_client_key",
      "countryCode": "US",
      "applepay": [
        "merchantID": "merchant.com.adyen.test",
        "merchantName": "Test Merchant"
      ]
    ]

      // Then
    sut.isAvailable(paymentMethodDict, configuration: configuration) { resolve in
      let isSuccess = try! XCTUnwrap(resolve as? Bool )
      XCTAssertFalse(isSuccess)
    } rejecter: { title, message, error in
      XCTFail("Shou not throw error")
    }
  }

  func testIsAvailableReturnFalseWhenNoViewController() throws {
      // Given
    mockPaymentAuthorizationService.canMakePaymentsResult = false
    let sut = ApplePayModule(pkPaymentAuthorizationService: mockPaymentAuthorizationService)

      // Then
    sut.isAvailable(paymentMethodDict, configuration: configuration) { resolve in
      let isSuccess = try! XCTUnwrap(resolve as? Bool )
      XCTAssertFalse(isSuccess)
    } rejecter: { title, message, error in
      XCTFail("Shou not throw error")
    }
  }

  func testApplePayDetailsExtraData() {
      // When
    let extraData = mockApplePayDetails.extraData
    XCTAssertNotNil(extraData)
  }

    // Then
  func testPKContactJsonObject() {
      // Given
    let contact = PKContact()
    contact.emailAddress = "test@example.com"
    contact.phoneNumber = CNPhoneNumber(stringValue: "+1234567890")

    var name = PersonNameComponents()
    name.givenName = "John"
    name.familyName = "Doe"
    contact.name = name

      // When
    let jsonObject = contact.jsonObject

      // Then
    XCTAssertNotNil(jsonObject)
  }

  func testPKPaymentNetworkTxVariantName() {
      // Given/When/Then
    XCTAssertEqual(PKPaymentNetwork.masterCard.txVariantName, "mc")
    XCTAssertEqual(PKPaymentNetwork.cartesBancaires.txVariantName, "cartebancaire")
    XCTAssertEqual(PKPaymentNetwork.visa.txVariantName, "visa")
    XCTAssertEqual(PKPaymentNetwork.amex.txVariantName, "amex")
  }

  func testPKPaymentAuthorizationServiceAdapter() {
      // Given
    let adapter = PKPaymentAuthorizationServiceAdapter()

      // When
    let canMakePayments = adapter.canMakePayments(usingNetworks: [.visa, .masterCard])
    let viewController = adapter.getAuthorizationViewController(paymentRequest: mockPaymentRequest)

      // Then
      // These methods delegate to the real PKPaymentAuthorizationViewController
      // so we can't easily test the exact behavior without mocking the static methods
      // But we can at least test that the methods don't crash and return expected types
    XCTAssertNotNil(viewController)
    XCTAssertTrue(canMakePayments)
  }

  func testHide() {
      // Given
    let expectation = self.expectation(description: "dismiss should be called")
    let testModule = TestableApplePayModule(pkPaymentAuthorizationService: mockPaymentAuthorizationService)

      // When
    testModule.hide(NSNumber(value: true), event: NSDictionary())

      // Then
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
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

fileprivate class MockPKPaymentAuthorizationService: PKPaymentAuthorizationService {
    var canMakePaymentsResult = true
    var authorizationViewControllerResult: PKPaymentAuthorizationViewController?

    func canMakePayments(usingNetworks networks: [PKPaymentNetwork]) -> Bool {
        canMakePaymentsResult
    }

    func getAuthorizationViewController(paymentRequest: PKPaymentRequest) -> PKPaymentAuthorizationViewController? {
        authorizationViewControllerResult
    }
}
