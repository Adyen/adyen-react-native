//
// Copyright (c) 2024 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation

import Adyen
@testable import adyen_react_native
import XCTest

final class DropInConfigurationParserTests: XCTestCase {

  func testNewDictionary() throws {
      let sut = DropInConfigurationParser(configuration: NSDictionary())
      XCTAssertTrue(sut.showPreselectedStoredPaymentMethod)
  }

  func testEmptyDictionary() throws {
      let sut = DropInConfigurationParser(configuration: 
                                            [
                                                "showPreselectedStoredPaymentMethod": false,
                                                "skipListWhenSinglePaymentMethod": false,
                                                "title": "MY_DROPIN",
                                                "showRemovePaymentMethodButton": true,
                                            ]
      )

      XCTAssertFalse(sut.showPreselectedStoredPaymentMethod)
      XCTAssertFalse(sut.skipListWhenSinglePaymentMethod)
      XCTAssertEqual(sut.title, "MY_DROPIN")
      XCTAssertTrue(sut.showRemovePaymentMethodButton)

      XCTAssertNotNil(sut.configuration)
      XCTAssertFalse(sut.configuration.allowPreselectedPaymentView)
      XCTAssertFalse(sut.configuration.allowsSkippingPaymentList)
      XCTAssertTrue(sut.configuration.paymentMethodsList.allowDisablingStoredPaymentMethods)
  }

  func testEmptySubDictionary() throws {
      let sut = DropInConfigurationParser(configuration: ["dropin": [:]])
      XCTAssertTrue(sut.showPreselectedStoredPaymentMethod)
  }

  func testRequestorAppUrl() throws {
      let sut = DropInConfigurationParser(configuration: ["dropin": ["showPreselectedStoredPaymentMethod": false]])
      XCTAssertFalse(sut.showPreselectedStoredPaymentMethod)
  }
  
}
