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

    func test_encode_serializesMinimalData_whenOnlyRequiredFieldsProvided() throws {
        // GIVEN
        let paymentDetails = InstantPaymentDetails(type: .payPal)
        let paymentData = PaymentComponentData(paymentMethodDetails: paymentDetails, order: nil)
        let encodableData = EncodablePaymentComponentData(data: paymentData)

        // WHEN
        let data = try encoder.encode(encodableData)
        let json = try XCTUnwrap(try JSONSerialization.jsonObject(with: data) as? [String: Any])

        // THEN
        XCTAssertNotNil(json["paymentMethod"])
        XCTAssertNil(json["storePaymentMethod"])
        XCTAssertNil(json["browserInfo"])
        XCTAssertNil(json["amount"])
        XCTAssertNil(json["order"])
        XCTAssertNil(json["checkoutAttemptId"])
        XCTAssertNil(json["installments"])
        // v6 no longer emits `supportNativeRedirect` or `delegatedAuthenticationData` from
        // EncodablePaymentComponentData; asserted here so a reappearance is caught.
        XCTAssertNil(json["supportNativeRedirect"])
        XCTAssertNil(json["delegatedAuthenticationData"])
    }

    func test_encode_serializesAllGeneralFields_whenAllDataProvided() throws {
        // GIVEN
        let paymentDetails = InstantPaymentDetails(type: .payPal)
        // v6 dropped `amount` from PaymentComponentData, and BrowserInfo now only has an async
        // failable initializer that reads the real user agent, so neither can be supplied here.
        var paymentData = PaymentComponentData(paymentMethodDetails: paymentDetails,
                                               order: PartialPaymentOrder(pspReference: "reference",
                                                                          orderData: nil),
                                               storePaymentMethod: true,
                                               installments: Installments(totalMonths: 3, plan: .regular))
        paymentData = paymentData.replacing(checkoutAttemptId: "attempt_id")
        let encodableData = EncodablePaymentComponentData(data: paymentData)

        // WHEN
        let data = try encoder.encode(encodableData)
        let json = try XCTUnwrap(try JSONSerialization.jsonObject(with: data) as? [String: Any])

        // THEN
        XCTAssertNotNil(json["paymentMethod"])
        XCTAssertTrue(try XCTUnwrap(json["storePaymentMethod"] as? Bool))
        XCTAssertNil(json["browserInfo"])
        XCTAssertNil(json["amount"])
        XCTAssertNotNil(json["order"])
        XCTAssertNotNil(json["checkoutAttemptId"])
        XCTAssertNotNil(json["installments"])
        // v6 no longer emits `supportNativeRedirect` or `delegatedAuthenticationData` from
        // EncodablePaymentComponentData; asserted here so a reappearance is caught.
        XCTAssertNil(json["supportNativeRedirect"])
    }

    func test_encode_includesCardSpecificFields_whenCardDetailsProvided() throws {
        // GIVEN
        let delegatedDataDict: NSDictionary = ["sdkInput": "SOME_DATA"]
        let delegatedData: DelegatedAuthenticationData = try delegatedDataDict.decode()
        let paymentDetails = CardDetails(paymentMethod: CardPaymentMethod(type: .scheme, name: "Card", fundingSource: .credit, brands: []),
                                         encryptedCard: EncryptedCard(number: nil, securityCode: nil, expiryMonth: nil, expiryYear: nil),
                                         socialSecurityNumber: "123-45-6789",
                                         delegatedAuthenticationData: delegatedData)
        var paymentData = PaymentComponentData(paymentMethodDetails: paymentDetails, order: nil)
        paymentData = paymentData.replacing(checkoutAttemptId: "attempt_id")
        let encodableData = EncodablePaymentComponentData(data: paymentData)

        // WHEN
        let data = try encoder.encode(encodableData)
        let json = try XCTUnwrap(try JSONSerialization.jsonObject(with: data) as? [String: Any])

        // THEN
        XCTAssertNotNil(json["paymentMethod"])
        XCTAssertEqual(json["socialSecurityNumber"] as? String, "123-45-6789")
        // v6 no longer emits `supportNativeRedirect` or `delegatedAuthenticationData` from
        // EncodablePaymentComponentData; asserted here so a reappearance is caught.
        XCTAssertNil(json["delegatedAuthenticationData"])
    }

    func test_encode_includesAffirmSpecificFields_whenAffirmDetailsProvided() throws {
        // GIVEN
        let paymentMethod = AffirmPaymentMethod(type: .affirm, name: "Affirm")
        let paymentDetails = AffirmDetails(paymentMethod: paymentMethod,
                                           shopperName: ShopperName(firstName: "John", lastName: "Doe"),
                                           telephoneNumber: "+1234567890",
                                           emailAddress: "test@example.com",
                                           billingAddress: PostalAddress(city: "Amsterdam", country: "NL"),
                                           deliveryAddress: PostalAddress(city: "Rotterdam", country: "NL"))
        let paymentData = PaymentComponentData(paymentMethodDetails: paymentDetails, order: nil)
        let encodableData = EncodablePaymentComponentData(data: paymentData)

        // WHEN
        let data = try encoder.encode(encodableData)
        let json = try XCTUnwrap(try JSONSerialization.jsonObject(with: data) as? [String: Any])

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
