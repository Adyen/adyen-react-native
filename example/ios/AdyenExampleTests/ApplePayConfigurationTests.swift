//
//  ApplePayConfigurationTests.swift
//  AdyenExampleTests
//
//  Created by vm on 19/10/2023.
//

import XCTest
import @testable adyen_react_native

final class ApplePayConfigurationTests: XCTestCase {
    func testExample() throws {
        let sut = ApplepayConfigurationParser(configuration: NSDictionary())
        XCTAssertNotNil(sut)
    }
}
