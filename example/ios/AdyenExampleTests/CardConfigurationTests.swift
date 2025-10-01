//
// Copyright (c) 2023 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import adyen_react_native
import PassKit
import XCTest

class AddressLookupProviderMock: AddressLookupProvider {
    func lookUp(searchTerm: String, resultHandler: @escaping ([Adyen.LookupAddressModel]) -> Void) {
        // Do nothing
    }
}

final class CardConfigurationTests: XCTestCase {

    let mockAmount = Amount(value: 1000, currencyCode: "USD", localeIdentifier: "en-US")
    let mockAddressLookupProvider = AddressLookupProviderMock()

    func test_initialization_createsConfiguration_withEmptyDictionary() throws {
        // GIVEN
        let emptyDict = NSDictionary()
        
        // WHEN
        let sut = CardConfigurationParser(configuration: emptyDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertNotNil(sut.configuration)
    }

    func test_initialization_createsConfiguration_withEmptySubDictionary() throws {
        // GIVEN
        let configDict: NSDictionary = ["card": [:]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertNotNil(sut.configuration)
    }

    func test_configuration_setsShowStorePaymentField_whenProvided() throws {
        // GIVEN
        let configDict: NSDictionary = ["card": ["showStorePaymentField": false]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertFalse(sut.configuration.showsStorePaymentMethodField)
    }

    func test_configuration_setsShowsHolderNameField_whenHolderNameRequired() throws {
        // GIVEN
        let configDict: NSDictionary = ["card": ["holderNameRequired": true]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertTrue(sut.configuration.showsHolderNameField)
    }

    func test_configuration_setsShowsSecurityCodeField_forStoredCard() throws {
        // GIVEN
        let configDict: NSDictionary = ["card": ["hideCvcStoredCard": false]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertTrue(sut.configuration.stored.showsSecurityCodeField) // inverted
    }

    func test_configuration_setsShowsSecurityCodeField_whenHideCvcIsFalse() throws {
        // GIVEN
        let configDict: NSDictionary = ["card": ["hideCvc": false]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertTrue(sut.configuration.showsSecurityCodeField) // inverted
    }

    func test_configuration_setsBillingAddressMode_toFull() throws {
        // GIVEN
        let configDict: NSDictionary = ["card": ["addressVisibility": "full"]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertEqual(sut.configuration.billingAddress.mode, .full)
    }

    func test_configuration_setsBillingAddressMode_toPostalCode() throws {
        // GIVEN
        let configDict: NSDictionary = ["card": ["addressVisibility": "postal"]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertEqual(sut.configuration.billingAddress.mode, .postalCode)
    }

    func test_configuration_setsKoreanAuthenticationMode_toHide() throws {
        // GIVEN
        let configDict: NSDictionary = ["card": ["kcpVisibility": "hide"]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertEqual(sut.configuration.koreanAuthenticationMode, .hide)
    }

    func test_configuration_setsKoreanAuthenticationMode_toShow() throws {
        // GIVEN
        let configDict: NSDictionary = ["card": ["kcpVisibility": "show"]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertEqual(sut.configuration.koreanAuthenticationMode, .show)
    }

    func test_configuration_setsSocialSecurityNumberMode_toHide() throws {
        // GIVEN
        let configDict: NSDictionary = ["card": ["socialSecurity": "hide"]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertEqual(sut.configuration.socialSecurityNumberMode, .hide)
    }

    func test_configuration_setsSocialSecurityNumberMode_toShow() throws {
        // GIVEN
        let configDict: NSDictionary = ["card": ["socialSecurity": "show"]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertEqual(sut.configuration.socialSecurityNumberMode, .show)
    }

    func test_configuration_setsAllowedCardTypes_whenProvided() throws {
        // GIVEN
        let configDict: NSDictionary = ["card": ["supported": ["visa", "mc", "maestro"]]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertEqual(sut.configuration.allowedCardTypes?.count, 3)
    }

    func test_configuration_setsBillingAddressCountryCodes_whenProvided() throws {
        // GIVEN
        let configDict: NSDictionary = ["card": ["allowedAddressCountryCodes": ["GB", "US"]]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertEqual(sut.configuration.billingAddress.countryCodes?.count, 2)
    }

}

extension CardComponent.AddressFormType: Equatable {

    public static func == (lhs: Self, rhs: Self) -> Bool {
        switch (lhs, rhs) {
        case (.full, .full):
            return true
        case (.none, .none):
            return true
        case (.postalCode, .postalCode):
            return true
        default:
            return false
        }
    }

}
