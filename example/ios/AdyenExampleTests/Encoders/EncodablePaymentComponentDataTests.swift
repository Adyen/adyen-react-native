//
// Copyright (c) 2021 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

@testable @_spi(AdyenInternal) import Adyen
@testable import adyen_react_native

import XCTest

class EncodablePaymentComponentDataTests: XCTestCase {

  let encoder = JSONEncoder()

  func testEncodingWithMinimalData() throws {
    // GIVEN
    let paymentDetails = InstantPaymentDetails(type: .payPal)
    let paymentData = PaymentComponentData(paymentMethodDetails: paymentDetails, amount: nil, order: nil)
    let encodableData = EncodablePaymentComponentData(data: paymentData)

    // WHEN
    let data = try encoder.encode(encodableData)
    let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]

    // THEN
    XCTAssertNotNil(json["paymentMethod"])
    XCTAssertNil(json["storePaymentMethod"])
    XCTAssertNil(json["browserInfo"])
    XCTAssertNil(json["amount"])
    XCTAssertNil(json["order"])
    XCTAssertNil(json["checkoutAttemptId"])
  }

  func testEncodingWithGerenalData() throws {
    // GIVEN
    let paymentDetails = InstantPaymentDetails(type: .payPal)
    var paymentData = PaymentComponentData(paymentMethodDetails: paymentDetails,
                                           amount: Amount(value: 100, currencyCode: "USD"),
                                           order: PartialPaymentOrder(pspReference: "reference",
                                                                      orderData: nil),
                                           storePaymentMethod: true,
                                           browserInfo: BrowserInfo(userAgent: "user_agent"),
                                           installments: Installments(totalMonths: 3, plan: .regular))
    paymentData = paymentData.replacing(checkoutAttemptId: "attempt_id")
    let encodableData = EncodablePaymentComponentData(data: paymentData)

    // WHEN
    let data = try encoder.encode(encodableData)
    let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]

    // THEN
    XCTAssertNotNil(json["paymentMethod"])
    XCTAssertTrue(json["storePaymentMethod"] as! Bool)
    XCTAssertNotNil(json["browserInfo"])
    XCTAssertNotNil(json["amount"])
    XCTAssertNotNil(json["order"])
    XCTAssertNotNil(json["checkoutAttemptId"])
    XCTAssertNotNil(json["installments"])
    XCTAssertNotNil(json["supportNativeRedirect"])
  }

  func testEncodingWitCardsData() throws {
    // GIVEN
    let delegatedDataRaw = "{\"sdkInput\": \"SOME_DATA\"}".data(using: .utf8)!
    let delegatedData = try JSONDecoder().decode(DelegatedAuthenticationData.self, from: delegatedDataRaw)
    let paymentDetails = CardDetails(paymentMethod: CardPaymentMethod(type: .scheme, name: "Card", fundingSource: .credit, brands: []),
                                     encryptedCard: EncryptedCard(number: nil, securityCode: nil, expiryMonth: nil, expiryYear: nil),
                                     socialSecurityNumber: "123-45-6789",
                                     delegatedAuthenticationData: delegatedData)
    var paymentData = PaymentComponentData(paymentMethodDetails: paymentDetails, amount: nil, order: nil)
    paymentData = paymentData.replacing(checkoutAttemptId: "attempt_id")
    let encodableData = EncodablePaymentComponentData(data: paymentData)

    // WHEN
    let data = try encoder.encode(encodableData)
    let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]

    // THEN
    XCTAssertNotNil(json["paymentMethod"])
    XCTAssertEqual(json["socialSecurityNumber"] as? String, "123-45-6789")
    XCTAssertNotNil(json["delegatedAuthenticationData"])
  }

  func testEncodingWithAffirmData() throws {
      // GIVEN
    let paymentMethod = AffirmPaymentMethod(type: .affirm, name: "Affirm")
    let paymentDetails = AffirmDetails(paymentMethod: paymentMethod,
                                       shopperName: ShopperName(firstName: "John", lastName: "Doe"),
                                       telephoneNumber: "+1234567890",
                                       emailAddress: "test@example.com",
                                       billingAddress: PostalAddress(city: "Amsterdam", country: "NL"),
                                       deliveryAddress:  PostalAddress(city: "Rotterdam", country: "NL"))
    let paymentData = PaymentComponentData( paymentMethodDetails: paymentDetails, amount: nil, order: nil)
    let encodableData = EncodablePaymentComponentData(data: paymentData)

      // WHEN
    let data = try encoder.encode(encodableData)
    let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]

      // THEN
    XCTAssertNotNil(json["paymentMethod"])
    XCTAssertEqual(json["shopperName"] as? [String: String], ["firstName": "John", "lastName": "Doe"])
    XCTAssertEqual(json["shopperEmail"] as? String, "test@example.com")
    XCTAssertEqual(json["telephoneNumber"] as? String, "+1234567890")

    guard let billingJson = json["billingAddress"] as? [String: String] else {
      return XCTFail("Billing address should be present in the JSON")
    }

    XCTAssertEqual(billingJson["city"], "Amsterdam")
    XCTAssertEqual(billingJson["country"], "NL")

    guard let deliveryAddress = json["deliveryAddress"] as? [String: String] else {
      return XCTFail("Delivery address should be present in the JSON")
    }
    XCTAssertEqual(deliveryAddress["city"], "Rotterdam")
    XCTAssertEqual(deliveryAddress["country"], "NL")
  }

}
