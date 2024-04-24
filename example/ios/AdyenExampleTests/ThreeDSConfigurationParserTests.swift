//
// Copyright (c) 2023 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
@testable import adyen_react_native
import XCTest

final class ThreeDSConfigurationParserTests: XCTestCase {

  func testNewDictionary() throws {
      let sut = ThreeDS2ConfigurationParser(configuration: NSDictionary())
      XCTAssertNil(sut.requestorAppUrl)
  }

  func testEmptyDictionary() throws {
      let sut = ThreeDS2ConfigurationParser(configuration: ["requestorAppUrl": "https://testing.com"])
      XCTAssertEqual(sut.requestorAppUrl, "https://testing.com")
  }

  func testEmptySubDictionary() throws {
      let sut = ThreeDS2ConfigurationParser(configuration: ["threeDS2": [:]])
      XCTAssertNil(sut.requestorAppUrl)
  }

  func testRequestorAppUrl() throws {
      let sut = ThreeDS2ConfigurationParser(configuration: ["threeDS2": ["requestorAppUrl": "https://testing.com"]])
      XCTAssertEqual(sut.requestorAppUrl, "https://testing.com")
  }

}
