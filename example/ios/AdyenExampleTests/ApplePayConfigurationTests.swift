//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import XCTest
import Adyen
import adyen_react_native
import PassKit

final class ApplePayConfigurationTests: XCTestCase {
  
  let mockAmount = Amount(value: 1000, currencyCode: "USD", localeIdentifier: "en-US")
  
  func testNewDictionary() throws {
    let sut = ApplepayConfigurationParser(configuration: NSDictionary())
    XCTAssertNotNil(sut)
  }
  
  func testEmptyDictionary() throws {
    let sut = ApplepayConfigurationParser(configuration: [:])
    XCTAssertNotNil(sut)
  }
  
  func testEmptySubDictionary() throws {
    let sut = ApplepayConfigurationParser(configuration: ["applepay":[:]])
    XCTAssertNotNil(sut)
    
    let expectation = self.expectation(description: "Expect throw")
    XCTAssertThrowsError(try sut.buildConfiguration(amount: mockAmount)) { error in
      XCTAssertEqual(error.localizedDescription, ApplepayConfigurationParser.ApplePayError.invalidMerchantID.localizedDescription)
      expectation.fulfill()
    }
    
    self.wait(for: [expectation], timeout: 1)
  }
  
  func testWrongSubDictionary() throws {
    let sut = ApplepayConfigurationParser(configuration: ["applepay": "some value"])
    let expectation = self.expectation(description: "Expect throw")
    XCTAssertThrowsError(try sut.buildConfiguration(amount: mockAmount)) { error in
      XCTAssertEqual(error.localizedDescription, ApplepayConfigurationParser.ApplePayError.invalidMerchantID.localizedDescription)
      expectation.fulfill()
    }
    
    self.wait(for: [expectation], timeout: 1)
  }
  
  func testThrowOnNoMerchantNameMerchantID() throws {
    let sut = ApplepayConfigurationParser(configuration: [
      "applepay":
        [
          "merchantID": "someID"
        ]
    ])
    
    let expectation = self.expectation(description: "Expect throw")
    XCTAssertThrowsError(try sut.buildConfiguration(amount: mockAmount)) { error in
      XCTAssertEqual(error.localizedDescription, ApplepayConfigurationParser.ApplePayError.invalidMerchantName.localizedDescription)
      expectation.fulfill()
    }
    
    self.wait(for: [expectation], timeout: 1)
  }
  
  func testMinimalValidDictionaryValues() throws {
    let sut = ApplepayConfigurationParser(configuration: [
      "applepay":
        [
          "merchantID": "merchant.com.adyen.test",
          "merchantName": "SomeName"
        ]
    ])
    let config = try sut.buildConfiguration(amount: mockAmount)
    XCTAssertNotNil(config.merchantIdentifier)
    XCTAssertNotNil(config.summaryItems)
    XCTAssertEqual(config.summaryItems.count, 1)
  }
  
  func testMinimalValidDictionaryValuesWithNoSubDirectory() throws {
    let sut = ApplepayConfigurationParser(configuration: [
      "merchantID": "merchant.com.adyen.test",
      "merchantName": "SomeName"
    ])
    let config = try sut.buildConfiguration(amount: mockAmount)
    XCTAssertNotNil(config.merchantIdentifier)
    XCTAssertNotNil(config.summaryItems)
    XCTAssertEqual(config.summaryItems.count, 1)
  }
  
  func testCorrectSummaryItems() throws {
    let sut = ApplepayConfigurationParser(configuration: [
      "applepay":
        [
          "merchantID": "merchant.com.adyen.test",
          "summaryItems": [
            [
              "label": "Item 1",
              "amount": "70.20"
            ],
            [
              "label": "Item 1",
              "value": "20"
            ],
            [
              "label": "Item 1",
              "value": 10
            ],
            [
              "label": "Total",
              "amount": 100.50
            ]
          ]
        ]
    ])
    let config = try sut.buildConfiguration(amount: mockAmount)
    XCTAssertNotNil(config.merchantIdentifier)
    XCTAssertNotNil(config.summaryItems)
    XCTAssertEqual(config.summaryItems.count, 4)
    XCTAssertEqual(config.summaryItems[0].amount, 70.20)
    XCTAssertEqual(config.summaryItems[1].amount, 20)
    XCTAssertEqual(config.summaryItems[2].amount, 10)
    XCTAssertEqual(config.summaryItems[3].amount, 100.50)
  }
  
  func testInvalidSummaryItemsThrows() throws {
    let sut = ApplepayConfigurationParser(configuration: ["applepay":
                                                            [
                                                              "merchantID": "merchant.com.adyen.test",
                                                              "summaryItems": []
                                                            ]
                                                         ])
    let expectation = self.expectation(description: "Expect throw")
    XCTAssertThrowsError(try sut.buildConfiguration(amount: mockAmount)) { error in
      XCTAssertEqual(error.localizedDescription, ApplepayConfigurationParser.ApplePayError.invalidMerchantName.localizedDescription)
      expectation.fulfill()
    }
    
    self.wait(for: [expectation], timeout: 1)
  }
  
  func testAllowOnboardingBoolValue() throws {
    let sut = ApplepayConfigurationParser(configuration: [
      "applepay":
        [
          "merchantID": "merchant.com.adyen.test",
          "merchantName": "SomeName",
          "allowOnboarding": true
        ]
    ])
    let config = try sut.buildConfiguration(amount: mockAmount)
    XCTAssertTrue(config.allowOnboarding)
  }
  
  func testAllowOnboardingStringValue() throws {
    let sut = ApplepayConfigurationParser(configuration: [
      "applepay":
        [
          "merchantID": "merchant.com.adyen.test",
          "merchantName": "SomeName",
          "allowOnboarding": "true"
        ]
    ])
    let config = try sut.buildConfiguration(amount: mockAmount)
    XCTAssertTrue(config.allowOnboarding)
  }
  
  func testAllowOnboardingNumericValue() throws {
    let sut = ApplepayConfigurationParser(configuration: [
      "applepay":
        [
          "merchantID": "merchant.com.adyen.test",
          "merchantName": "SomeName",
          "allowOnboarding": 1
        ]
    ])
    let config = try sut.buildConfiguration(amount: mockAmount)
    XCTAssertTrue(config.allowOnboarding)
  }
  
  func testBillingAddress() throws {
    let sut = ApplepayConfigurationParser(configuration: [
      "applepay":
        [
          "merchantID": "merchant.com.adyen.test",
          "merchantName": "SomeName",
          "billingContact": [
            "phoneNumber": "123-456-7890",
            "emailAddress": "example@email.com",
            "givenName": "John",
            "familyName": "Doe",
            "phoneticGivenName": "John",
            "phoneticFamilyName": "Doe",
            "addressLines": ["123 Main St", "Apt 4B"],
            "subLocality": "Suburb",
            "locality": "City",
            "postalCode": "12345",
            "subAdministrativeArea": "County",
            "administrativeArea": "State",
            "country": "Country",
            "countryCode": "US"
          ]
        ]
    ])
    
    let contact = try XCTUnwrap(sut.buildConfiguration(amount: mockAmount).billingContact)
    XCTAssertEqual(contact.phoneNumber?.stringValue, "123-456-7890")
    XCTAssertEqual(contact.emailAddress, "example@email.com")
    XCTAssertEqual(contact.name?.givenName, "John")
    XCTAssertEqual(contact.name?.familyName, "Doe")
    XCTAssertEqual(contact.name?.phoneticRepresentation?.givenName, "John")
    XCTAssertEqual(contact.name?.phoneticRepresentation?.familyName, "Doe")
    XCTAssertEqual(contact.postalAddress?.street, "123 Main St\nApt 4B")
    XCTAssertEqual(contact.postalAddress?.subLocality, "Suburb")
    XCTAssertEqual(contact.postalAddress?.city, "City")
    XCTAssertEqual(contact.postalAddress?.postalCode, "12345")
    XCTAssertEqual(contact.postalAddress?.subAdministrativeArea, "County")
    XCTAssertEqual(contact.postalAddress?.state, "State")
    XCTAssertEqual(contact.postalAddress?.country, "Country")
    XCTAssertEqual(contact.postalAddress?.isoCountryCode, "US")
  }
  
  func testBillingAddressWIthNoPhoneticNameAndNoAddress() throws {
    let sut = ApplepayConfigurationParser(configuration: [
      "applepay":
        [
          "merchantID": "merchant.com.adyen.test",
          "merchantName": "SomeName",
          "billingContact": [
            "phoneNumber": "123-456-7890",
            "givenName": "John",
            "familyName": "Doe",
          ]
        ]
    ])
    
    let contact = try XCTUnwrap(sut.buildConfiguration(amount: mockAmount).billingContact)
    XCTAssertEqual(contact.phoneNumber?.stringValue, "123-456-7890")
    XCTAssertNil(contact.emailAddress)
    XCTAssertEqual(contact.name?.givenName, "John")
    XCTAssertEqual(contact.name?.familyName, "Doe")
    XCTAssertNil(contact.name?.phoneticRepresentation)
    XCTAssertNil(contact.postalAddress)
    XCTAssertNil(contact.emailAddress)
  }
  
  func testBillingAddressWIthNoName() throws {
    let sut = ApplepayConfigurationParser(configuration: [
      "applepay":
        [
          "merchantID": "merchant.com.adyen.test",
          "merchantName": "SomeName",
          "billingContact": [
            "emailAddress": "example@email.com",
            "phoneticGivenName": "John",
            "phoneticFamilyName": "Doe",
          ]
        ]
    ])
    
    let contact = try XCTUnwrap(sut.buildConfiguration(amount: mockAmount).billingContact)
    XCTAssertNil(contact.phoneNumber)
    XCTAssertEqual(contact.emailAddress, "example@email.com")
    XCTAssertNil(contact.name?.givenName)
    XCTAssertNil(contact.name?.familyName)
    XCTAssertEqual(contact.name?.phoneticRepresentation?.givenName, "John")
    XCTAssertEqual(contact.name?.phoneticRepresentation?.familyName, "Doe")
  }
  
  func testRequiredBillingFiledsWithEmptyArray() throws {
    let sut = ApplepayConfigurationParser(configuration: [
      "applepay":
        [
          "merchantID": "merchant.com.adyen.test",
          "merchantName": "SomeName",
          "requiredBillingContactFields": []
        ]
    ])
    let config = try sut.buildConfiguration(amount: mockAmount)
    XCTAssertEqual(config.requiredBillingContactFields.count, 0)
  }
  
  func testRequiredBillingFileds() throws {
    let sut = ApplepayConfigurationParser(configuration: [
      "applepay":
        [
          "merchantID": "merchant.com.adyen.test",
          "merchantName": "SomeName",
          "requiredBillingContactFields": ["emailAddress", "phoneNumber", "postalAddress"]
        ]
    ])
    let config = try sut.buildConfiguration(amount: mockAmount)
    XCTAssertEqual(config.requiredBillingContactFields.count, 3)
    XCTAssertTrue(config.requiredBillingContactFields.contains(.phoneNumber))
    XCTAssertTrue(config.requiredBillingContactFields.contains(.emailAddress))
    XCTAssertTrue(config.requiredBillingContactFields.contains(.postalAddress))
  }
  
  func testRequiredShippingFileds() throws {
    let sut = ApplepayConfigurationParser(configuration: [
      "applepay":
        [
          "merchantID": "merchant.com.adyen.test",
          "merchantName": "SomeName",
          "requiredShippingContactFields": ["email", "phone", "phoneticName", "name", "post"]
        ]
    ])
    let config = try sut.buildConfiguration(amount: mockAmount)
    XCTAssertEqual(config.requiredShippingContactFields.count, 5)
    XCTAssertTrue(config.requiredShippingContactFields.contains(.phoneNumber))
    XCTAssertTrue(config.requiredShippingContactFields.contains(.emailAddress))
    XCTAssertTrue(config.requiredShippingContactFields.contains(.name))
    XCTAssertTrue(config.requiredShippingContactFields.contains(.phoneticName))
    XCTAssertTrue(config.requiredShippingContactFields.contains(.postalAddress))
  }
  
  // 'postalAddress' | 'name' | 'phoneticName' | 'phone' | 'email';
  func testPKContactField() throws {
    XCTAssertNotEqual(PKContactField.init(rawValue: "phoneNumber"), PKContactField.phoneNumber)
    XCTAssertEqual(PKContactField.init(rawValue: "phone"), PKContactField.phoneNumber)
    XCTAssertNotEqual(PKContactField.init(rawValue: "emailAddress"), PKContactField.emailAddress)
    XCTAssertEqual(PKContactField.init(rawValue: "email"), PKContactField.emailAddress)
    XCTAssertNotEqual(PKContactField.init(rawValue: "postalAddress"), PKContactField.postalAddress)
    XCTAssertEqual(PKContactField.init(rawValue: "post"), PKContactField.postalAddress)
    XCTAssertEqual(PKContactField.init(rawValue: "phoneticName"), PKContactField.phoneticName)
    XCTAssertEqual(PKContactField.init(rawValue: "name"), PKContactField.name)
  }
  
}
