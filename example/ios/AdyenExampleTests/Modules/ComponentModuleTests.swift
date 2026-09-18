//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import XCTest
@testable @_spi(AdyenInternal) import Adyen
@testable import adyen_react_native

/// `register` / `unregister` and `supportedEvents()` are main-actor isolated, so the whole test
/// case runs on the main actor.
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

    func test_supportedEvents_isEmpty_becauseTheModuleEmitsNothing() {
        // Every event reaches JS through ContextModule instead.
        // TODO: Confirm this is still the case in v6.
        XCTAssertEqual(sut.supportedEvents() ?? [], [])
    }

    // MARK: - Registration

    func test_register_returnsAProxyForTheView() {
        // WHEN
        let proxy = sut.register(viewId: "card-view")

        // THEN
        XCTAssertEqual(proxy.viewId, "card-view")
    }

    func test_register_replacesTheProxyForTheSameViewId() {
        // GIVEN a registered view
        let first = sut.register(viewId: "card-view")

        // WHEN the same id registers again, as it would after a remount
        let second = sut.register(viewId: "card-view")

        // THEN the newer proxy takes its place
        XCTAssertFalse(first === second)
    }

}
