//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import XCTest
@testable @_spi(AdyenInternal) import Adyen
@testable import adyen_react_native

final class InstantModuleTests: XCTestCase {

    // MARK: - flow(for:)

    func test_flow_payByBankUS() throws {
        // GIVEN – decode from JSON so we don't depend on any internal init
        let dict: NSDictionary = ["type": "paybybank_AIS_DD", "name": "Pay By Bank US"]
        let method: PayByBankUSPaymentMethod = try dict.decode()

        // WHEN
        let flow = InstantModule.flow(for: method)

        // THEN
        guard case .payByBankUS = flow else {
            return XCTFail("Expected .payByBankUS, got \(flow)")
        }
    }

    func test_flow_issuerList() throws {
        // GIVEN – IssuerListPaymentMethod only has init(from:), so use JSON decode
        let dict: NSDictionary = ["type": "ideal", "name": "iDEAL", "issuers": []]
        let method: IssuerListPaymentMethod = try dict.decode()

        // WHEN
        let flow = InstantModule.flow(for: method)

        // THEN
        guard case .issuerList = flow else {
            return XCTFail("Expected .issuerList, got \(flow)")
        }
    }

    func test_flow_instant_fallsBackForUnknownType() {
        // GIVEN – InstantPaymentMethod is the SDK's generic fallback type
        let method = InstantPaymentMethod(type: .payPal, name: "PayPal")

        // WHEN
        let flow = InstantModule.flow(for: method)

        // THEN
        guard case .instant = flow else {
            return XCTFail("Expected .instant, got \(flow)")
        }
    }
}
