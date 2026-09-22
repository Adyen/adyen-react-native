//
// Copyright (c) 2023 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

@testable @_spi(AdyenInternal) import Adyen
@testable import adyen_react_native
import PassKit
import XCTest

final class CardConfigurationTests: XCTestCase {

    let mockAmount = Amount(value: 1000, currencyCode: "USD", localeIdentifier: "en-US")

    func test_initialization_createsConfiguration_withEmptyDictionary() {
        // GIVEN
        let emptyDict = NSDictionary()
        
        // WHEN
        let sut = CardConfigurationParser(configuration: emptyDict)
        
        // THEN
        XCTAssertNotNil(sut.configuration)
    }

    func test_initialization_createsConfiguration_withEmptySubDictionary() {
        // GIVEN
        let configDict: NSDictionary = ["card": [:]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertNotNil(sut.configuration)
    }

    func test_configuration_setsShowStorePaymentField_whenProvided() {
        // GIVEN
        let configDict: NSDictionary = ["card": ["showStorePaymentField": false]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertFalse(sut.showsStorePaymentMethodField)
    }

    func test_configuration_setsShowsHolderNameField_whenHolderNameRequired() {
        // GIVEN
        let configDict: NSDictionary = ["card": ["holderNameRequired": true]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertTrue(sut.showsHolderNameField)
    }

    func test_configuration_setsShowsSecurityCodeField_forStoredCard() {
        // GIVEN
        let configDict: NSDictionary = ["card": ["hideCvcStoredCard": false]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertTrue(sut.showsStoredSecurityCodeField) // inverted
    }

    func test_configuration_setsShowsSecurityCodeField_whenHideCvcIsFalse() {
        // GIVEN
        let configDict: NSDictionary = ["card": ["hideCvc": false]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertTrue(sut.showsSecurityCodeField) // inverted
    }

    func test_configuration_setsBillingAddressMode_toFull() {
        // GIVEN
        let configDict: NSDictionary = ["card": ["addressVisibility": "full"]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict)
        
        // THEN
        guard case .full = sut.billingAddressMode else {
            return XCTFail("Expected .full billing address mode")
        }
    }

    func test_configuration_setsBillingAddressMode_toPostalCode() {
        // GIVEN
        let configDict: NSDictionary = ["card": ["addressVisibility": "postal"]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict)
        
        // THEN
        guard case .postalCode = sut.billingAddressMode else {
            return XCTFail("Expected .postalCode billing address mode")
        }
    }

    func test_configuration_setsKoreanAuthenticationMode_toHide() {
        // GIVEN
        let configDict: NSDictionary = ["card": ["kcpVisibility": "hide"]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertEqual(sut.kcpVisibility, .hide)
    }

    func test_configuration_setsKoreanAuthenticationMode_toShow() {
        // GIVEN
        let configDict: NSDictionary = ["card": ["kcpVisibility": "show"]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertEqual(sut.kcpVisibility, .show)
    }

    func test_configuration_setsSocialSecurityNumberMode_toHide() {
        // GIVEN
        let configDict: NSDictionary = ["card": ["socialSecurity": "hide"]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertEqual(sut.socialSecurityVisibility, .hide)
    }

    func test_configuration_setsSocialSecurityNumberMode_toShow() {
        // GIVEN
        let configDict: NSDictionary = ["card": ["socialSecurity": "show"]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertEqual(sut.socialSecurityVisibility, .show)
    }

    func test_configuration_setsAllowedCardTypes_whenProvided() {
        // GIVEN
        let configDict: NSDictionary = ["card": ["supported": ["visa", "mc", "maestro"]]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertEqual(sut.supportedCardBrands?.count, 3)
    }

    func test_configuration_setsBillingAddressCountryCodes_whenProvided() {
        // GIVEN
        let configDict: NSDictionary = ["card": ["allowedAddressCountryCodes": ["GB", "US"]]]
        
        // WHEN
        let sut = CardConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertEqual(sut.billingAddressCountryCodes?.count, 2)
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
        let sut = CardConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertNotNil(sut.installmentConfiguration)
        XCTAssertEqual(sut.installmentConfiguration?.defaultOptions?.regularInstallmentMonths, [2, 3])
        XCTAssertFalse(sut.installmentConfiguration?.defaultOptions?.includesRevolving ?? true)
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
        let sut = CardConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertNotNil(sut.installmentConfiguration)
        XCTAssertTrue(sut.installmentConfiguration?.defaultOptions?.includesRevolving ?? false)
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
        let sut = CardConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertNotNil(sut.installmentConfiguration)
        XCTAssertEqual(sut.installmentConfiguration?.cardBasedOptions?.count, 2)
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
        let sut = CardConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertNotNil(sut.installmentConfiguration)
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
        let sut = CardConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertFalse(sut.installmentConfiguration?.showInstallmentAmount ?? true)
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
        let sut = CardConfigurationParser(configuration: configDict)
        
        // THEN
        let showInstallmentAmount = try XCTUnwrap(sut.installmentConfiguration?.showInstallmentAmount)
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
        let sut = CardConfigurationParser(configuration: configDict)
        
        // THEN
        let showInstallmentAmount = try XCTUnwrap(sut.installmentConfiguration?.showInstallmentAmount)
        XCTAssertFalse(showInstallmentAmount)
    }

}
