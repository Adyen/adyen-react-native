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

    func testNewDictionary() throws {
      let sut = CardConfigurationParser(configuration: NSDictionary(), delegate: mockAddressLookupProvider)
        XCTAssertNotNil(sut.configuration)
    }

    func testEmptyDictionary() throws {
        let sut = CardConfigurationParser(configuration: [:], delegate: mockAddressLookupProvider)
        XCTAssertNotNil(sut.configuration)
    }

    func testEmptySubDictionary() throws {
        let sut = CardConfigurationParser(configuration: ["card": [:]], delegate: mockAddressLookupProvider)
        XCTAssertNotNil(sut.configuration)
    }

    func testShowStorePaymentField() throws {
        let sut = CardConfigurationParser(configuration: ["card": ["showStorePaymentField": false]], delegate: mockAddressLookupProvider)
        XCTAssertFalse(sut.configuration.showsStorePaymentMethodField)
    }

    func testHolderNameRequired() throws {
        let sut = CardConfigurationParser(configuration: ["card": ["holderNameRequired": true]], delegate: mockAddressLookupProvider)
        XCTAssertTrue(sut.configuration.showsHolderNameField)
    }

    func testHideCvcStoredCard() throws {
        let sut = CardConfigurationParser(configuration: ["card": ["hideCvcStoredCard": false]], delegate: mockAddressLookupProvider)
        XCTAssertTrue(sut.configuration.stored.showsSecurityCodeField) // inverted
    }

    func testHideCvc() throws {
        let sut = CardConfigurationParser(configuration: ["card": ["hideCvc": false]], delegate: mockAddressLookupProvider)
      XCTAssertTrue(sut.configuration.showsSecurityCodeField) // inverted
    }

    func testFullAddressVisibility() throws {
        let sut = CardConfigurationParser(configuration: ["card": ["addressVisibility": "full"]], delegate: mockAddressLookupProvider)
      XCTAssertEqual(sut.configuration.billingAddress.mode, .full)
    }

  func testPostalAddressVisibility() throws {
      let sut = CardConfigurationParser(configuration: ["card": ["addressVisibility": "postal"]], delegate: mockAddressLookupProvider)
    XCTAssertEqual(sut.configuration.billingAddress.mode, .postalCode)
  }

    func testHideKcpVisibility() throws {
        let sut = CardConfigurationParser(configuration: ["card": ["kcpVisibility": "hide"]], delegate: mockAddressLookupProvider)
      XCTAssertEqual(sut.configuration.koreanAuthenticationMode, .hide)
    }

  func testShowKcpVisibility() throws {
      let sut = CardConfigurationParser(configuration: ["card": ["kcpVisibility": "show"]], delegate: mockAddressLookupProvider)
    XCTAssertEqual(sut.configuration.koreanAuthenticationMode, .show)
  }

    func testHideSocialSecurity() throws {
        let sut = CardConfigurationParser(configuration: ["card": ["socialSecurity": "hide"]], delegate: mockAddressLookupProvider)
      XCTAssertEqual(sut.configuration.socialSecurityNumberMode, .hide)
    }

  func testShowSocialSecurity() throws {
      let sut = CardConfigurationParser(configuration: ["card": ["socialSecurity": "show"]], delegate: mockAddressLookupProvider)
    XCTAssertEqual(sut.configuration.socialSecurityNumberMode, .show)
  }

    func testAllowedCardTypes() throws {
      let sut = CardConfigurationParser(configuration: ["card": ["supported": ["visa", "mc", "maestro"]]], delegate: mockAddressLookupProvider)
      XCTAssertEqual(sut.configuration.allowedCardTypes?.count, 3)
    }

    func testBillingAddressCountryCodes() throws {
        let sut = CardConfigurationParser(configuration: ["card": ["allowedAddressCountryCodes": ["GB", "US"]]], delegate: mockAddressLookupProvider)
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
