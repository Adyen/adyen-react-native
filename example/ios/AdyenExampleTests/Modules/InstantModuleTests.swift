//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import XCTest
@testable @_spi(AdyenInternal) import Adyen
@testable import adyen_react_native

final class InstantModuleTests: XCTestCase {

    // MARK: - Setup

    private var context: AdyenContext!

    override func setUpWithError() throws {
        try super.setUpWithError()
        let apiContext = try APIContext(environment: Environment.test, clientKey: "test_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
        context = AdyenContext(apiContext: apiContext, payment: nil)
    }

    override func tearDown() {
        context = nil
        super.tearDown()
    }

    // MARK: - flow(for:)

    func test_flow_payByBankUS() throws {
        // GIVEN
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
        // GIVEN
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
        // GIVEN
        let method = InstantPaymentMethod(type: .payPal, name: "PayPal")

        // WHEN
        let flow = InstantModule.flow(for: method)

        // THEN
        guard case .instant = flow else {
            return XCTFail("Expected .instant, got \(flow)")
        }
    }

    // MARK: - Flow.launchStyle

    func test_launchStyle_payByBankUS() throws {
        // GIVEN
        let dict: NSDictionary = ["type": "paybybank_AIS_DD", "name": "Pay By Bank US"]
        let method: PayByBankUSPaymentMethod = try dict.decode()

        // WHEN / THEN
        XCTAssertEqual(InstantModule.Flow.payByBankUS(method).launchStyle, .present)
    }

    func test_launchStyle_issuerList() throws {
        // GIVEN
        let dict: NSDictionary = ["type": "ideal", "name": "iDEAL", "issuers": []]
        let method: IssuerListPaymentMethod = try dict.decode()

        // WHEN / THEN
        XCTAssertEqual(InstantModule.Flow.issuerList(method).launchStyle, .present)
    }

    func test_launchStyle_instant() {
        // GIVEN
        let method = InstantPaymentMethod(type: .payPal, name: "PayPal")

        // WHEN / THEN
        XCTAssertEqual(InstantModule.Flow.instant(method).launchStyle, .initiatePayment)
    }

    // MARK: - makeComponent(for:context:)

    func test_makeComponent_payByBankUS() throws {
        // GIVEN
        let dict: NSDictionary = ["type": "paybybank_AIS_DD", "name": "Pay By Bank US"]
        let method: PayByBankUSPaymentMethod = try dict.decode()

        // WHEN
        let component = InstantModule.makeComponent(for: .payByBankUS(method), context: context)

        // THEN
        XCTAssertTrue(component is PayByBankUSComponent, "Expected PayByBankUSComponent, got \(type(of: component))")
    }

    func test_makeComponent_issuerList() throws {
        // GIVEN
        let dict: NSDictionary = ["type": "ideal", "name": "iDEAL", "issuers": []]
        let method: IssuerListPaymentMethod = try dict.decode()

        // WHEN
        let component = InstantModule.makeComponent(for: .issuerList(method), context: context)

        // THEN
        XCTAssertTrue(component is IssuerListComponent, "Expected IssuerListComponent, got \(type(of: component))")
    }

    func test_makeComponent_instant() {
        // GIVEN
        let method = InstantPaymentMethod(type: .payPal, name: "PayPal")

        // WHEN
        let component = InstantModule.makeComponent(for: .instant(method), context: context)

        // THEN
        XCTAssertTrue(component is InstantPaymentComponent, "Expected InstantPaymentComponent, got \(type(of: component))")
    }
}
