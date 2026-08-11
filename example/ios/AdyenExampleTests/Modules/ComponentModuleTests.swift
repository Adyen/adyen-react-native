//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import XCTest
@testable @_spi(AdyenInternal) import Adyen
@testable import adyen_react_native

final class ComponentModuleTests: XCTestCase {

    private var sut: ComponentModule!
    private var mockEmitter: MockEmitter!

    override func setUp() {
        super.setUp()
        BaseModule.session = nil
        mockEmitter = MockEmitter()
        sut = ComponentModule()
        sut.emitterOverride = mockEmitter
    }

    override func tearDown() {
        BaseModule.session = nil
        sut = nil
        mockEmitter = nil
        super.tearDown()
    }

    // MARK: - supportedEvents

    func test_supportedEvents_includesActionFlowEvents() {
        // WHEN
        let events = sut.supportedEvents() ?? []

        // THEN
        XCTAssertTrue(events.contains(EventName.submit.rawValue))
        XCTAssertTrue(events.contains(EventName.additionalDetails.rawValue))
        XCTAssertTrue(events.contains(EventName.complete.rawValue))
        XCTAssertTrue(events.contains(EventName.fail.rawValue))
    }

    // MARK: - open

    func test_open_withInvalidPaymentMethods_emitsFailEvent() {
        // GIVEN
        let invalidPaymentMethods: NSDictionary = [:]
        let configuration: NSDictionary = ["clientKey": "test_client_key"]

        // WHEN
        sut.open(invalidPaymentMethods, configuration: configuration)

        // THEN
        XCTAssertEqual(mockEmitter.eventCount(named: EventName.fail.rawValue), 1)
    }

    // MARK: - isAvailable

    func test_isAvailable_alwaysReturnsFalse() {
        // GIVEN
        let paymentMethod: NSDictionary = [:]
        let configuration: NSDictionary = [:]
        let expectation = expectation(description: "isAvailable resolves")

        // WHEN
        sut.isAvailable(paymentMethod, configuration: configuration, resolver: { result in
            // THEN
            XCTAssertEqual(result as? Bool, false)
            expectation.fulfill()
        }, rejecter: { _, _, _ in
            XCTFail("isAvailable should not reject")
        })

        waitForExpectations(timeout: 1)
    }
}
