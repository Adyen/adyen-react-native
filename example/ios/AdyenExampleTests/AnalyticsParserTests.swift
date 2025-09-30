//
// Copyright (c) 2024 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
@testable import adyen_react_native
import XCTest

class AnalyticsParserTests: XCTestCase {

    func test_initialization_createsDefaultConfiguration() {
        // GIVEN
        let configuration: NSDictionary = ["analitics": [:]]

        // WHEN
        let sut = AnalyticsParser(configuration: configuration)
        
        // THEN
        XCTAssertNotNil(sut)
        XCTAssertTrue(sut.analyticsOn)
        XCTAssertFalse(sut.verboseLogsOn)
    }

    func test_analyticsOn_returnsFalse_whenEnabledIsFalse() {
        // GIVEN
        let configuration: NSDictionary = ["enabled": false as NSNumber]

        // WHEN
        let sut = AnalyticsParser(configuration: configuration)
        
        // THEN
        XCTAssertFalse(sut.analyticsOn)
    }

    func test_analyticsOn_returnsTrue_whenEnabledIsTrue() {
        // GIVEN
        let configuration: NSDictionary = ["enabled": true as NSNumber]

        // WHEN
        let sut = AnalyticsParser(configuration: configuration)
        
        // THEN
        XCTAssertTrue(sut.analyticsOn)
    }

    func test_verboseLogsOn_returnsTrue_whenVerboseLogsIsTrue() {
        // GIVEN
        let configuration: NSDictionary = ["verboseLogs": true as NSNumber]

        // WHEN
        let sut = AnalyticsParser(configuration: configuration)
        
        // THEN
        XCTAssertTrue(sut.verboseLogsOn)
    }

    func test_verboseLogsOn_returnsFalse_whenVerboseLogsIsFalse() {
        // GIVEN
        let configuration: NSDictionary = ["verboseLogs": false as NSNumber]
        
        // WHEN
        let sut = AnalyticsParser(configuration: configuration)
        
        // THEN
        XCTAssertFalse(sut.verboseLogsOn)
    }
}
