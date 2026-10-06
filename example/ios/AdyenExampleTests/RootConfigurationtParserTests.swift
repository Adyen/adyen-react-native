//
// Copyright (c) 2024 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
@testable import adyen_react_native
import XCTest

class RootParserTests: XCTestCase {

    func test_initialization_usesDefaultValues_withEmptyConfiguration() {
        // GIVEN
        let configDict: NSDictionary = [:]

        // WHEN
        let sut = RootConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertNotNil(sut)
        XCTAssertEqual(sut.environment, .test)
        XCTAssertNil(sut.amount)
        XCTAssertNil(sut.countryCode)
        XCTAssertNil(sut.shopperLocale)
    }

    func test_environment_returnsLiveEurope_whenConfiguredWithLiveEU() {
        // GIVEN
        let configDict: NSDictionary = ["environment": "live-eu"]

        // WHEN
        let sut = RootConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertEqual(sut.environment, .liveEurope)
    }

    func test_environment_returnsLiveIndia_whenConfiguredWithLiveIN() {
        // GIVEN
        let configDict: NSDictionary = ["environment": "live-in"]

        // WHEN
        let sut = RootConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertEqual(sut.environment, .liveIndia)
    }

    func test_environment_returnsLiveUnitedStates_whenConfiguredWithLiveUS() {
        // GIVEN
        let configDict: NSDictionary = ["environment": "live-us"]

        // WHEN
        let sut = RootConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertEqual(sut.environment, .liveUnitedStates)
    }

    func test_environment_returnsLiveAustralia_whenConfiguredWithLiveAU() {
        // GIVEN
        let configDict: NSDictionary = ["environment": "live-au"]

        // WHEN
        let sut = RootConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertEqual(sut.environment, .liveAustralia)
    }

    func test_environment_returnsLiveAPSE_whenConfiguredWithLiveAPSE() {
        // GIVEN
        let configDict: NSDictionary = ["environment": "live-apse"]

        // WHEN
        let sut = RootConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertEqual(sut.environment, .liveApse)
    }

    func test_environment_returnsLiveNea_whenConfiguredWithLiveNEA() {
        // GIVEN
        let configDict: NSDictionary = ["environment": "live-nea"]

        // WHEN
        let sut = RootConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertEqual(sut.environment, .liveNea)
    }

    func test_clientKey_returnsConfiguredValue_whenProvided() {
        // GIVEN
        let configDict: NSDictionary = ["clientKey": "client-key"]

        // WHEN
        let sut = RootConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertEqual(sut.clientKey, "client-key")
    }

    func test_amount_parsesNumericValue_whenConfiguredWithIntegerAmount() {
        // GIVEN
        let configDict: NSDictionary = ["amount": ["value": 100, "currency": "EUR"]]

        // WHEN
        let sut = RootConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertEqual(sut.amount?.value, 100)
        XCTAssertEqual(sut.amount?.currencyCode, "EUR")
    }

    func test_amount_parsesStringValue_whenConfiguredWithStringAmount() {
        // GIVEN
        let configDict: NSDictionary = ["amount": ["value": "100", "currency": "EUR"]]

        // WHEN
        let sut = RootConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertEqual(sut.amount?.value, 100)
        XCTAssertEqual(sut.amount?.currencyCode, "EUR")
    }

    func test_amount_truncatesToInteger_whenConfiguredWithFloatAmount() {
        // GIVEN
        let configDict: NSDictionary = ["amount": ["value": 100.3, "currency": "EUR"]]

        // WHEN
        let sut = RootConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertEqual(sut.amount?.value, 100)
        XCTAssertEqual(sut.amount?.currencyCode, "EUR")
    }

    func test_countryCode_returnsConfiguredValue_whenProvided() {
        // GIVEN
        let configDict: NSDictionary = ["countryCode": "US"]

        // WHEN
        let sut = RootConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertEqual(sut.countryCode, "US")
    }

    func test_amount_isParsed_whenAmountAndCountryProvided() {
        // GIVEN
        let configDict: NSDictionary = ["amount": ["value": 100, "currency": "EUR"], "countryCode": "US"]

        // WHEN
        let sut = RootConfigurationParser(configuration: configDict)

        // THEN
        // v6 replaced the composed `payment` object with separate `amount` / `countryCode`.
        XCTAssertEqual(sut.amount?.value, 100)
        XCTAssertEqual(sut.amount?.currencyCode, "EUR")
        XCTAssertEqual(sut.countryCode, "US")
    }

    func test_shopperLocale_returnsConfiguredValue_whenProvided() {
        // GIVEN
        let configDict: NSDictionary = ["locale": "en-US"]

        // WHEN
        let sut = RootConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertEqual(sut.shopperLocale, "en-US")
    }

}
