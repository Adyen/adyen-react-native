//
// Copyright (c) 2023 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

@_spi(AdyenInternal) import Adyen
@testable import adyen_react_native
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

    func test_initialization_createsConfiguration_withEmptyDictionary() {
        // GIVEN
        let emptyDict = NSDictionary()
        
        // WHEN
        let sut = CardConfigurationParser(configuration: emptyDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertNotNil(sut.configuration)
    }

    func test_initialization_createsConfiguration_withEmptySubDictionary() {
        // GIVEN
        let configDict: NSDictionary = ["card": [:]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertNotNil(sut.configuration)
    }

    func test_configuration_showsSubmitButtonByDefault() {
        // GIVEN
        let configDict: NSDictionary = ["card": [:]]

        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)

        // THEN
        XCTAssertTrue(sut.showsSubmitButton)
    }

    func test_configuration_hidesSubmitButton_whenConfigured() {
        // GIVEN
        let configDict: NSDictionary = ["card": ["showSubmitButton": false]]

        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)

        // THEN
        XCTAssertFalse(sut.showsSubmitButton)
    }

    func test_configuration_setsShowStorePaymentField_whenProvided() {
        // GIVEN
        let configDict: NSDictionary = ["card": ["showStorePaymentField": false]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertFalse(sut.configuration.showsStorePaymentMethodField)
    }

    func test_configuration_setsShowsHolderNameField_whenHolderNameRequired() {
        // GIVEN
        let configDict: NSDictionary = ["card": ["holderNameRequired": true]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertTrue(sut.configuration.showsHolderNameField)
    }

    func test_configuration_setsShowsSecurityCodeField_forStoredCard() {
        // GIVEN
        let configDict: NSDictionary = ["card": ["hideCvcStoredCard": false]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertTrue(sut.configuration.stored.showsSecurityCodeField) // inverted
    }

    func test_configuration_setsShowsSecurityCodeField_whenHideCvcIsFalse() {
        // GIVEN
        let configDict: NSDictionary = ["card": ["hideCvc": false]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertTrue(sut.configuration.showsSecurityCodeField) // inverted
    }

    func test_configuration_setsBillingAddressMode_toFull() {
        // GIVEN
        let configDict: NSDictionary = ["card": ["addressVisibility": "full"]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertEqual(sut.configuration.billingAddress.mode, .full)
    }

    func test_configuration_setsBillingAddressMode_toPostalCode() {
        // GIVEN
        let configDict: NSDictionary = ["card": ["addressVisibility": "postal"]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertEqual(sut.configuration.billingAddress.mode, .postalCode)
    }

    func test_configuration_setsKoreanAuthenticationMode_toHide() {
        // GIVEN
        let configDict: NSDictionary = ["card": ["kcpVisibility": "hide"]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertEqual(sut.configuration.koreanAuthenticationMode, .hide)
    }

    func test_configuration_setsKoreanAuthenticationMode_toShow() {
        // GIVEN
        let configDict: NSDictionary = ["card": ["kcpVisibility": "show"]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertEqual(sut.configuration.koreanAuthenticationMode, .show)
    }

    func test_configuration_setsSocialSecurityNumberMode_toHide() {
        // GIVEN
        let configDict: NSDictionary = ["card": ["socialSecurity": "hide"]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertEqual(sut.configuration.socialSecurityNumberMode, .hide)
    }

    func test_configuration_setsSocialSecurityNumberMode_toShow() {
        // GIVEN
        let configDict: NSDictionary = ["card": ["socialSecurity": "show"]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertEqual(sut.configuration.socialSecurityNumberMode, .show)
    }

    func test_configuration_setsAllowedCardTypes_whenProvided() {
        // GIVEN
        let configDict: NSDictionary = ["card": ["supported": ["visa", "mc", "maestro"]]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertEqual(sut.configuration.allowedCardTypes?.count, 3)
    }

    func test_configuration_setsBillingAddressCountryCodes_whenProvided() {
        // GIVEN
        let configDict: NSDictionary = ["card": ["allowedAddressCountryCodes": ["GB", "US"]]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertEqual(sut.configuration.billingAddress.countryCodes?.count, 2)
    }

    func test_configuration_setsInstallmentConfiguration_withDefaultOptions() {
        // GIVEN
        let configDict: NSDictionary = [
            "card": [
                "installmentOptions": [
                    "card": [
                        "values": [1, 2, 3]
                    ]
                ]
            ]
        ]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertNotNil(sut.configuration.installmentConfiguration)
        XCTAssertEqual(sut.configuration.installmentConfiguration?.defaultOptions?.regularInstallmentMonths, [2, 3])
        XCTAssertFalse(sut.configuration.installmentConfiguration?.defaultOptions?.includesRevolving ?? true)
    }

    func test_configuration_setsInstallmentConfiguration_withRevolvingPlan() {
        // GIVEN
        let configDict: NSDictionary = [
            "card": [
                "installmentOptions": [
                    "card": [
                        "values": [1, 2, 3],
                        "plans": ["revolving", "regular"]
                    ]
                ]
            ]
        ]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertNotNil(sut.configuration.installmentConfiguration)
        XCTAssertTrue(sut.configuration.installmentConfiguration?.defaultOptions?.includesRevolving ?? false)
    }

    func test_configuration_setsInstallmentConfiguration_withCardBasedOptions() {
        // GIVEN
        let configDict: NSDictionary = [
            "card": [
                "installmentOptions": [
                    "visa": [
                        "values": [1, 2, 3, 4]
                    ],
                    "mc": [
                        "values": [1, 2, 3]
                    ]
                ]
            ]
        ]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertNotNil(sut.configuration.installmentConfiguration)
        XCTAssertEqual(sut.configuration.installmentConfiguration?.cardBasedOptions?.count, 2)
    }

    func test_configuration_setsInstallmentConfiguration_withMixedOptions() {
        // GIVEN
        let configDict: NSDictionary = [
            "card": [
                "installmentOptions": [
                    "card": [
                        "values": [1, 2]
                    ],
                    "visa": [
                        "values": [1, 2, 3, 4],
                        "plans": ["revolving"]
                    ]
                ]
            ]
        ]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertNotNil(sut.configuration.installmentConfiguration)
    }

    func test_configuration_showInstallmentAmount_defaultsToFalse() {
        // GIVEN
        let configDict: NSDictionary = [
            "card": [
                "installmentOptions": [
                    "card": [
                        "values": [1, 2, 3]
                    ]
                ]
            ]
        ]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        XCTAssertFalse(sut.configuration.installmentConfiguration?.showInstallmentAmount ?? true)
    }

    func test_configuration_showInstallmentAmount_canBeSetToTrue() throws {
        // GIVEN
        let configDict: NSDictionary = [
            "card": [
                "installmentOptions": [
                    "card": [
                        "values": [1, 2, 3]
                    ]
                ],
                "showInstallmentAmount": true
            ]
        ]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        let showInstallmentAmount = try XCTUnwrap(sut.configuration.installmentConfiguration?.showInstallmentAmount)
        XCTAssertTrue(showInstallmentAmount)
    }

    func test_configuration_showInstallmentAmount_canBeSetToFalse() throws {
        // GIVEN
        let configDict: NSDictionary = [
            "card": [
                "installmentOptions": [
                    "card": [
                        "values": [1, 2, 3]
                    ]
                ],
                "showInstallmentAmount": false
            ]
        ]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict, delegate: mockAddressLookupProvider)
        
        // THEN
        let showInstallmentAmount = try XCTUnwrap(sut.configuration.installmentConfiguration?.showInstallmentAmount)
        XCTAssertFalse(showInstallmentAmount)
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
