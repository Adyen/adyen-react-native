//
// Copyright (c) 2023 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
@testable import adyen_react_native
import XCTest

final class ThreeDSConfigurationParserTests: XCTestCase {

    func test_requestorAppUrl_returnsNil_withEmptyConfiguration() {
        // GIVEN
        let configDict = NSDictionary()
        
        // WHEN
        let sut = ThreeDS2ConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertNil(sut.requestorAppUrl)
    }

    func test_requestorAppUrl_returnsConfiguredValue_whenProvidedInRootDictionary() {
        // GIVEN
        let configDict: NSDictionary = ["requestorAppUrl": "https://testing.com"]

        // WHEN
        let sut = ThreeDS2ConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertEqual(sut.requestorAppUrl, "https://testing.com")
    }

    func test_requestorAppUrl_returnsNil_withEmptyThreeDS2Dictionary() {
        // GIVEN
        let configDict: NSDictionary = ["threeDS2": [:]]

        // WHEN
        let sut = ThreeDS2ConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertNil(sut.requestorAppUrl)
    }

    func test_requestorAppUrl_returnsConfiguredValue_whenProvidedInThreeDS2Dictionary() {
        // GIVEN
        let configDict: NSDictionary = ["threeDS2": ["requestorAppUrl": "https://testing.com"]]
        
        // WHEN
        let sut = ThreeDS2ConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertEqual(sut.requestorAppUrl, "https://testing.com")
    }

}
