//
// Copyright (c) 2024 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
@testable import adyen_react_native
import XCTest

class PartialPaymentParserTests: XCTestCase {

    func test_initialization_defaultsToPinRequired_withEmptyConfiguration() {
        // GIVEN
        let configDict: NSDictionary = ["partialPayment": [:]]
        
        // WHEN
        let sut = PartialPaymentParser(configuration: configDict)
        
        // THEN
        XCTAssertNotNil(sut)
        XCTAssertTrue(sut.pinRequired)
    }

    func test_pinRequired_returnsFalse_whenConfiguredAsFalse() {
        // GIVEN
        let configDict: NSDictionary = ["pinRequired": false as NSNumber]

        // WHEN
        let sut = PartialPaymentParser(configuration: configDict)
        
        // THEN
        XCTAssertFalse(sut.pinRequired)
    }

    func test_pinRequired_returnsTrue_whenConfiguredAsTrue() {
        // GIVEN
        let configDict: NSDictionary = ["pinRequired": true as NSNumber]

        // WHEN
        let sut = PartialPaymentParser(configuration: configDict)
        
        // THEN
        XCTAssertTrue(sut.pinRequired)
    }
}
