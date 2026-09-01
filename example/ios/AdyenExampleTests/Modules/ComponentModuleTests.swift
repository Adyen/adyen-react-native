//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import XCTest
@testable @_spi(AdyenInternal) import Adyen
@testable import adyen_react_native

/// `emitterOverride` and `supportedEvents()` are main-actor isolated, so the whole test case
/// runs on the main actor.
@MainActor
final class ComponentModuleTests: XCTestCase {

    private var sut: ComponentModule!
    private var mockEmitter: MockEmitter!

    override func setUp() {
        super.setUp()
        mockEmitter = MockEmitter()
        sut = ComponentModule()
        sut.emitterOverride = mockEmitter
    }

    override func tearDown() {
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

    // Removed: `test_isAvailable_alwaysReturnsFalse`. Availability moved to
    // `ContextModule.isAvailable(_:resolver:rejecter:)` in v6; `ComponentModule` no longer
    // exposes it. `ContextModuleTests` is the right home for that coverage.
}
