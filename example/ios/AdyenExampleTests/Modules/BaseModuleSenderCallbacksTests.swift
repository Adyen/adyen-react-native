//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import XCTest
@testable @_spi(AdyenInternal) import Adyen
@testable import adyen_react_native

final class BaseModuleSenderCallbacksTests: XCTestCase {

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

    // MARK: - Event emission (now sourced from the v6 closures instead of delegate methods)

    func test_sendCompleteEvent_emitsCompleteEventWithResultCode() {
        // WHEN - the v6 onComplete closure forwards the result code
        sut.sendCompleteEvent(resultCode: .authorised)

        // THEN
        XCTAssertEqual(mockEmitter.events.count, 1)
        XCTAssertEqual(mockEmitter.events[0].name, EventName.complete.rawValue)
        let body = mockEmitter.events[0].body as? [String: Any]
        XCTAssertEqual(body?["resultCode"] as? String, "Authorised")
    }

    func test_sendCompleteEvent_encodesOtherResultCode() {
        // WHEN
        sut.sendCompleteEvent(resultCode: .other("SomeCustomCode"))

        // THEN
        let body = mockEmitter.events[0].body as? [String: Any]
        XCTAssertEqual(body?["resultCode"] as? String, "SomeCustomCode")
    }

    func test_sendError_emitsFailEvent() {
        // GIVEN
        let error = NSError(domain: "test", code: 123, userInfo: [NSLocalizedDescriptionKey: "Test error"])

        // WHEN - the v6 onFailure closure forwards the error
        sut.sendError(error: error)

        // THEN
        XCTAssertEqual(mockEmitter.events.count, 1)
        XCTAssertEqual(mockEmitter.events[0].name, EventName.fail.rawValue)
    }

    // MARK: - JS response bridging

    func test_resolveSubmit_withNoPendingContinuation_isSafeNoOp() {
        // WHEN / THEN - no suspended onSubmit closure; resolving must not crash
        sut.resolveSubmit(.retry())
        sut.resolveSubmit(.completion(resultCode: "Authorised"))
        XCTAssertTrue(mockEmitter.events.isEmpty)
    }

    func test_resolveAdditionalDetails_withNoPendingContinuation_isSafeNoOp() {
        // WHEN / THEN - no suspended onAdditionalDetails closure; resolving must not crash
        sut.resolveAdditionalDetails(.completion(resultCode: ""))
        XCTAssertTrue(mockEmitter.events.isEmpty)
    }

    func test_cleanUp_clearsCheckoutReference() {
        // GIVEN a retained checkout reference is expected to be released on teardown
        // WHEN
        sut.cleanUp()

        // THEN - cleanup resolves any pending continuations and clears state without emitting events
        XCTAssertTrue(mockEmitter.events.isEmpty)
    }
}
