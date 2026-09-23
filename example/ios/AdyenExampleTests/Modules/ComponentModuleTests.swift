//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import XCTest
@testable @_spi(AdyenInternal) import Adyen
@testable import adyen_react_native

@MainActor
final class ComponentModuleTests: XCTestCase {

    private var sut: ComponentModule!

    override func setUp() {
        super.setUp()
        sut = ComponentModule()
    }

    override func tearDown() {
        sut = nil
        super.tearDown()
    }

    // MARK: - supportedEvents

    func test_supportedEvents_isEmpty_becauseTheModuleEmitsNothing() {
        XCTAssertEqual(sut.supportedEvents() ?? [], [])
    }
}
