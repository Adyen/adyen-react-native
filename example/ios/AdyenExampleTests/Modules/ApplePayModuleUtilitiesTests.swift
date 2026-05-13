//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import XCTest
@_spi(AdyenInternal) import Adyen
@testable import adyen_react_native
import PassKit

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

    func test_applePayError_shippingAddress_usesDefaultKey_whenFieldIsNil() {
        let error = applePayError(from: ["type": "shippingAddress", "message": "Error"])
        XCTAssertNotNil(error)
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
