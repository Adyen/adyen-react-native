//
// Copyright (c) 2023 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import adyen_react_native
import PassKit
import XCTest

final class CardConfigurationTests: XCTestCase {

    let mockAmount = Amount(value: 1000, currencyCode: "USD", localeIdentifier: "en-US")

    func testNewDictionary() throws {
        let sut = CardConfigurationParser(configuration: NSDictionary())
        XCTAssertNotNil(sut.configuration)
    }

    func testEmptyDictionary() throws {
        let sut = CardConfigurationParser(configuration: [:])
        XCTAssertNotNil(sut.configuration)
    }

    func testEmptySubDictionary() throws {
        let sut = CardConfigurationParser(configuration: ["card": [:]])
        XCTAssertNotNil(sut.configuration)
    }

    func testShowStorePaymentField() throws {
        let sut = CardConfigurationParser(configuration: ["card": ["showStorePaymentField": false]])
        XCTAssertFalse(sut.configuration.showsStorePaymentMethodField)
    }

    func testHolderNameRequired() throws {
        let sut = CardConfigurationParser(configuration: ["card": ["holderNameRequired": true]])
        XCTAssertTrue(sut.configuration.showsHolderNameField)
    }

    func testHideCvcStoredCard() throws {
        let sut = CardConfigurationParser(configuration: ["card": ["hideCvcStoredCard": false]])
        XCTAssertTrue(sut.configuration.stored.showsSecurityCodeField) // inverted
    }

    func testHideCvc() throws {
        let sut = CardConfigurationParser(configuration: ["card": ["hideCvc": false]])
      XCTAssertTrue(sut.configuration.showsSecurityCodeField) // inverted
    }

    func testFullAddressVisibility() throws {
        let sut = CardConfigurationParser(configuration: ["card": ["addressVisibility": "full"]])
      XCTAssertEqual(sut.configuration.billingAddress.mode, .full)
    }

  func testPostalAddressVisibility() throws {
      let sut = CardConfigurationParser(configuration: ["card": ["addressVisibility": "postal"]])
    XCTAssertEqual(sut.configuration.billingAddress.mode, .postalCode)
  }

    func testHideKcpVisibility() throws {
        let sut = CardConfigurationParser(configuration: ["card": ["kcpVisibility": "hide"]])
      XCTAssertEqual(sut.configuration.koreanAuthenticationMode, .hide)
    }

  func testShowKcpVisibility() throws {
      let sut = CardConfigurationParser(configuration: ["card": ["kcpVisibility": "show"]])
    XCTAssertEqual(sut.configuration.koreanAuthenticationMode, .show)
  }

    func testHideSocialSecurity() throws {
        let sut = CardConfigurationParser(configuration: ["card": ["socialSecurity": "hide"]])
      XCTAssertEqual(sut.configuration.socialSecurityNumberMode, .hide)
    }

  func testShowSocialSecurity() throws {
      let sut = CardConfigurationParser(configuration: ["card": ["socialSecurity": "show"]])
    XCTAssertEqual(sut.configuration.socialSecurityNumberMode, .show)
  }

    func testAllowedCardTypes() throws {
      let sut = CardConfigurationParser(configuration: ["card": ["supported": ["visa", "mc", "maestro"]]])
      XCTAssertEqual(sut.configuration.allowedCardTypes?.count, 3)
    }

    func testBillingAddressCountryCodes() throws {
        let sut = CardConfigurationParser(configuration: ["card": ["allowedAddressCountryCodes": ["GB", "US"]]])
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
