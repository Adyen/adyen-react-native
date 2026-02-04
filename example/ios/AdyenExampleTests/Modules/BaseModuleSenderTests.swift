//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import XCTest
@_spi(AdyenInternal) import Adyen
@testable import adyen_react_native

final class BaseModuleSenderTests: XCTestCase {

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

    // MARK: - sendEvent(event:) Tests

    func test_sendEvent_emitsEventWithEmptyBody() {
        // WHEN
        sut.sendEvent(event: .complete)

        // THEN
        XCTAssertEqual(mockEmitter.events.count, 1)
        XCTAssertEqual(mockEmitter.events[0].name, Events.complete.rawValue)
        XCTAssertNotNil(mockEmitter.events[0].body)
    }

    // MARK: - sendEvent(event:body:) Tests

    func test_sendEventWithBody_emitsEventWithBody() {
        // GIVEN
        let body = ["key": "value"]

        // WHEN
        sut.sendEvent(event: .changeBinValue, body: body)

        // THEN
        XCTAssertEqual(mockEmitter.events.count, 1)
        XCTAssertEqual(mockEmitter.events[0].name, Events.changeBinValue.rawValue)
        let eventBody = mockEmitter.events[0].body as? [String: String]
        XCTAssertEqual(eventBody?["key"], "value")
    }

    // MARK: - sendCompleteEvent Tests

    func test_sendCompleteEvent_emitsCompleteEventWithPresentToShopperResult() {
        // WHEN
        sut.sendCompleteEvent()

        // THEN
        XCTAssertEqual(mockEmitter.events.count, 1)
        XCTAssertEqual(mockEmitter.events[0].name, Events.complete.rawValue)
        let body = mockEmitter.events[0].body as? [String: Any]
        XCTAssertEqual(body?["resultCode"] as? String, "PresentToShopper")
    }
}

// MARK: - Testable Subclass

/// Testable subclass that doesn't require React Native initialization
final class TestableBaseModuleSender: BaseModuleSender {
    override init() {
        super.init()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}
