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

    // MARK: - PaymentFlowType.init(_:)

    func test_flowType_payByBankUS() throws {
        // GIVEN
        let dict: NSDictionary = ["type": "paybybank_AIS_DD", "name": "Pay By Bank US"]
        let method: PayByBankUSPaymentMethod = try dict.decode()

        // WHEN
        let flowType = InstantModule.PaymentFlowType(method)

        // THEN
        guard case .payByBankUS = flowType else {
            return XCTFail("Expected .payByBankUS, got \(flowType)")
        }
    }

    func test_flowType_issuerList() throws {
        // GIVEN
        let dict: NSDictionary = ["type": "ideal", "name": "iDEAL", "issuers": []]
        let method: IssuerListPaymentMethod = try dict.decode()

        // WHEN
        let flowType = InstantModule.PaymentFlowType(method)

        // THEN
        guard case .issuerList = flowType else {
            return XCTFail("Expected .issuerList, got \(flowType)")
        }
    }

    func test_flowType_instant_fallsBackForUnknownType() {
        // GIVEN
        let method = InstantPaymentMethod(type: .payPal, name: "PayPal")

        // WHEN
        let flowType = InstantModule.PaymentFlowType(method)

        // THEN
        guard case .instant = flowType else {
            return XCTFail("Expected .instant, got \(flowType)")
        }
    }

    // MARK: - PaymentFlowType.buildFlow(with:)

    func test_buildFlow_payByBankUS() throws {
        // GIVEN
        let dict: NSDictionary = ["type": "paybybank_AIS_DD", "name": "Pay By Bank US"]
        let method: PayByBankUSPaymentMethod = try dict.decode()

        // WHEN
        let flow = InstantModule.PaymentFlowType.payByBankUS(method).buildFlow(with: context)

        // THEN
        guard case let .present(component) = flow else {
            return XCTFail("Expected .present, got \(flow)")
        }
        XCTAssertTrue(component is PayByBankUSComponent, "Expected PayByBankUSComponent, got \(type(of: component))")
        XCTAssertTrue(flow.paymentComponent is PayByBankUSComponent, "Expected paymentComponent to be PayByBankUSComponent, got \(type(of: flow.paymentComponent))")
    }

    func test_buildFlow_issuerList() throws {
        // GIVEN
        let dict: NSDictionary = ["type": "ideal", "name": "iDEAL", "issuers": []]
        let method: IssuerListPaymentMethod = try dict.decode()

        // WHEN
        let flow = InstantModule.PaymentFlowType.issuerList(method).buildFlow(with: context)

        // THEN
        guard case let .present(component) = flow else {
            return XCTFail("Expected .present, got \(flow)")
        }
        XCTAssertTrue(component is IssuerListComponent, "Expected IssuerListComponent, got \(type(of: component))")
        XCTAssertTrue(flow.paymentComponent is IssuerListComponent, "Expected paymentComponent to be IssuerListComponent, got \(type(of: flow.paymentComponent))")
    }

    func test_buildFlow_instant() {
        // GIVEN
        let method = InstantPaymentMethod(type: .payPal, name: "PayPal")

        // WHEN
        let flow = InstantModule.PaymentFlowType.instant(method).buildFlow(with: context)

        // THEN
        guard case let .submit(instant) = flow else {
            return XCTFail("Expected .submit, got \(flow)")
        }
        XCTAssertTrue(flow.paymentComponent is InstantPaymentComponent, "Expected paymentComponent to be InstantPaymentComponent, got \(type(of: flow.paymentComponent))")
    }
}
