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

        // TODO(v6-dropin): DropInConfigurationParser no longer builds a v5
        // DropInComponent.Configuration. Re-assert the built configuration once the
        // v6 Drop-in lands and the parser feeds the shared `dropIn { }` configuration block.
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
