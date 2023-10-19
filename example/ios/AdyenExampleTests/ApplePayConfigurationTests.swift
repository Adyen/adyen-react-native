//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import XCTest
import Adyen
import adyen_react_native

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
    let sut = ApplepayConfigurationParser(configuration: ["apple":[:]])
      XCTAssertNotNil(sut)
      XCTAssertThrowsError(try sut.buildConfiguration(amount: mockAmount))
  }
  
  func testWrongSubDictionary() throws {
    let sut = ApplepayConfigurationParser(configuration: ["apple":"some value"])
    XCTAssertNotNil(sut)
  }
  
  func testThrowOnInvalidMerchantID() throws {
    let sut = ApplepayConfigurationParser(configuration: ["apple":
                                                            [ "merchantID": "someID" ]
                                                         ])
    XCTAssertThrowsError(try sut.buildConfiguration(amount: mockAmount)) { error in
      XCTAssertEqual(error.localizedDescription, ApplepayConfigurationParser.ApplePayError.invalidMerchantID.localizedDescription)
    }
  }
  
  func testMinimalCurrectDictionaryValues() throws {
    let sut = ApplepayConfigurationParser(configuration: ["apple":
                                                            [ "merchantID": "merchant.com.adyen.test",
                                                              "merchantName": "SomeName"
                                                            ]
                                                         ])
    let config = try sut.buildConfiguration(amount: mockAmount)
    XCTAssertNotNil(config.merchantIdentifier)
    XCTAssertNotNil(config.summaryItems)
  }
}
