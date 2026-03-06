//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import XCTest
@testable @_spi(AdyenInternal) import Adyen
@testable import adyen_react_native

final class BaseModuleSenderDelegatesTests: XCTestCase {

    var sut: TestableBaseModuleSender!
    var mockEmitter: MockEmitter!

    override func setUp() {
        super.setUp()
        mockEmitter = MockEmitter()
        sut = TestableBaseModuleSender()
        sut.emitterOverride = mockEmitter
    }

    override func tearDown() {
        sut = nil
        mockEmitter = nil
        super.tearDown()
    }
    
    private func makeCardComponent() -> CardComponent {
        let paymentMethod = CardPaymentMethod(type: .bcmc, name: "Card", fundingSource: .credit, brands: [.bcmc])
        let context = AdyenContext(
            apiContext: try! APIContext(environment: Environment.test, clientKey: "local_DUMMYKEYFORTESTING"),
            payment: nil
        )
        return CardComponent(paymentMethod: paymentMethod, context: context)
    }

    // MARK: - PaymentComponentDelegate Tests

    func test_didSubmit_sendsSubmitEvent() {
        // GIVEN
        let details = InstantPaymentDetails(type: .payPal)
        let data = PaymentComponentData(paymentMethodDetails: details, amount: nil, order: nil)
        let component = MockPaymentComponent()

        // WHEN
        sut.didSubmit(data, from: component)

        // THEN
        XCTAssertEqual(mockEmitter.events.count, 1)
        XCTAssertEqual(mockEmitter.events[0].name, Events.submit.rawValue)
        let body = mockEmitter.events[0].body as? [String: Any]
        XCTAssertNotNil(body?["paymentData"])
        let paymentData = body?["paymentData"] as? [String: Any]
        XCTAssertNotNil(paymentData?["paymentMethod"])
    }

    func test_didFail_fromPaymentComponent_sendsErrorEvent() {
        // GIVEN
        let error = NSError(domain: "test", code: 123, userInfo: [NSLocalizedDescriptionKey: "Test error"])
        let component = MockPaymentComponent()

        // WHEN
        sut.didFail(with: error, from: component)

        // THEN
        XCTAssertEqual(mockEmitter.events.count, 1)
        XCTAssertEqual(mockEmitter.events[0].name, Events.fail.rawValue)
    }

    // MARK: - ActionComponentDelegate Tests

    func test_didFail_fromActionComponent_sendsErrorEvent() {
        // GIVEN
        let error = NSError(domain: "test", code: 456, userInfo: [NSLocalizedDescriptionKey: "Action error"])
        let component = MockActionComponent()

        // WHEN
        sut.didFail(with: error, from: component)

        // THEN
        XCTAssertEqual(mockEmitter.events.count, 1)
        XCTAssertEqual(mockEmitter.events[0].name, Events.fail.rawValue)
    }

    func test_didComplete_fromActionComponent_sendsCompleteEvent() {
        // GIVEN
        let component = MockActionComponent()

        // WHEN
        sut.didComplete(from: component)

        // THEN
        XCTAssertEqual(mockEmitter.events.count, 1)
        XCTAssertEqual(mockEmitter.events[0].name, Events.complete.rawValue)
        let body = mockEmitter.events[0].body as? [String: Any]
        XCTAssertEqual(body?["resultCode"] as? String, "PresentToShopper")
    }

    func test_didProvide_fromActionComponent_sendsProvideEvent() {
        // GIVEN
        let details = ThreeDS2Details.fingerprint("fingerprint123")
        let data = ActionComponentData(details: details, paymentData: "testPaymentData")
        let component = MockActionComponent()

        // WHEN
        sut.didProvide(data, from: component)

        // THEN
        XCTAssertEqual(mockEmitter.events.count, 1)
        XCTAssertEqual(mockEmitter.events[0].name, Events.additionalDetails.rawValue)
    }

    // MARK: - CardComponentDelegate Tests

    func test_didChangeBIN_sendsChangeBinValueEvent() {
        // GIVEN
        let binValue = "411111"
        let component = makeCardComponent()

        // WHEN
        sut.didChangeBIN(binValue, component: component)

        // THEN
        XCTAssertEqual(mockEmitter.events.count, 1)
        XCTAssertEqual(mockEmitter.events[0].name, Events.changeBinValue.rawValue)
        XCTAssertEqual(mockEmitter.events[0].body as? String, binValue)
    }

    func test_didChangeCardBrand_withBrands_sendsBinLookupEvent() {
        // GIVEN
        let brands = [CardBrand(type: .visa), CardBrand(type: .masterCard)]
        let component = makeCardComponent()

        // WHEN
        sut.didChangeCardBrand(brands, component: component)

        // THEN
        XCTAssertEqual(mockEmitter.events.count, 1)
        XCTAssertEqual(mockEmitter.events[0].name, Events.binLookup.rawValue)
        let body = mockEmitter.events[0].body as? [[String: Any]]
        XCTAssertEqual(body?.count, 2)
        XCTAssertEqual(body?[0]["brand"] as? String, "visa")
        XCTAssertEqual(body?[1]["brand"] as? String, "mc")
    }

    func test_didChangeCardBrand_withNil_doesNotSendEvent() {
        // GIVEN
        let component = makeCardComponent()

        // WHEN
        sut.didChangeCardBrand(nil, component: component)

        // THEN
        XCTAssertEqual(mockEmitter.events.count, 0)
    }

    func test_didChangeCardBrand_withEmptyArray_doesNotSendEvent() {
        // GIVEN
        let component = makeCardComponent()

        // WHEN
        sut.didChangeCardBrand([], component: component)

        // THEN
        XCTAssertEqual(mockEmitter.events.count, 0)
    }

    func test_didSubmit_lastFour_doesNotSendEvent() {
        // GIVEN
        let component = makeCardComponent()

        // WHEN
        sut.didSubmit(lastFour: "1234", finalBIN: "411111", component: component)

        // THEN - No callback implemented, should not emit any event
        XCTAssertEqual(mockEmitter.events.count, 0)
    }
}

// MARK: - Mock Components

private final class MockPaymentComponent: PaymentComponent {
    var context: AdyenContext = .init(
        apiContext: try! APIContext(environment: Environment.test, clientKey: "local_DUMMYKEYFORTESTING"),
        payment: nil
    )
    var delegate: PaymentComponentDelegate?
    var paymentMethod: PaymentMethod = InstantPaymentMethod(type: .payPal, name: "Test")
}

private final class MockActionComponent: ActionComponent {
    var context: AdyenContext = .init(
        apiContext: try! APIContext(environment: Environment.test, clientKey: "local_DUMMYKEYFORTESTING"),
        payment: nil
    )
    var delegate: ActionComponentDelegate?
}
