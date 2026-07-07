//
// Copyright (c) 2024 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
@testable import adyen_react_native
import Foundation
import XCTest

final class DropInConfigurationParserTests: XCTestCase {

    func test_initialization_usesDefaultValues_withNewDictionary() {
        // GIVEN
        let configDict = NSDictionary()
        
        // WHEN
        let sut = DropInConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertTrue(sut.showPreselectedStoredPaymentMethod)
    }

    func test_initialization_appliesProvidedSettings_withFullConfiguration() {
        // GIVEN
        let configDict: NSDictionary = [
            "showPreselectedStoredPaymentMethod": false,
            "skipListWhenSinglePaymentMethod": false,
            "title": "MY_DROPIN",
            "showRemovePaymentMethodButton": true
        ]

        // WHEN
        let sut = DropInConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertFalse(sut.showPreselectedStoredPaymentMethod)
        XCTAssertFalse(sut.skipListWhenSinglePaymentMethod)
        XCTAssertEqual(sut.title, "MY_DROPIN")
        XCTAssertTrue(sut.showRemovePaymentMethodButton)

        XCTAssertNotNil(sut.configuration)
        XCTAssertFalse(sut.configuration.allowPreselectedPaymentView)
        XCTAssertFalse(sut.configuration.allowsSkippingPaymentList)
        XCTAssertTrue(sut.configuration.paymentMethodsList.allowDisablingStoredPaymentMethods)
    }

    func test_initialization_usesDefaultValues_withEmptySubDictionary() {
        // GIVEN
        let configDict: NSDictionary = ["dropin": [:]]

        // WHEN
        let sut = DropInConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertTrue(sut.showPreselectedStoredPaymentMethod)
    }

    func test_showPreselectedStoredPaymentMethod_returnsFalse_whenExplicitlySet() {
        // GIVEN
        let configDict: NSDictionary = ["dropin": ["showPreselectedStoredPaymentMethod": false]]
        
        // WHEN
        let sut = DropInConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertFalse(sut.showPreselectedStoredPaymentMethod)
    }
  
}
