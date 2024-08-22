//
// Copyright (c) 2024 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation

import XCTest
import Adyen
@testable import adyen_react_native
import PassKit

final class ApplePayRecurringConfigurationParserTests: XCTestCase {

  @available(iOS 16.0, *)
  func testBasicRecurringConfiguration() throws {
    let sut = ApplePayRecurringConfigurationParser(configuration: [
      "description": "Some description",
      "regularBilling": [
        "amount": 1000,
        "label": "Some Label"
      ],
      "managementURL" : "https://some-domain.com"
    ])

    XCTAssertEqual(sut.paymentDescription, "Some description")
    let regularBilling = try XCTUnwrap(sut.regularBilling)
    XCTAssertEqual(regularBilling.label, "Some Label")
    XCTAssertEqual(regularBilling.amount, 1000)
    XCTAssertEqual(regularBilling.intervalUnit, .month)
    XCTAssertEqual(regularBilling.intervalCount, 1)
    XCTAssertNil(regularBilling.startDate)
    XCTAssertNil(regularBilling.endDate)
    XCTAssertEqual(sut.managementURL?.absoluteString, "https://some-domain.com")
  }

  @available(iOS 16.0, *)
  func testAllFieldsRecurringConfiguration() throws {
    let sut = ApplePayRecurringConfigurationParser(configuration: [
      "description": "Some description",
      "regularBilling": [
        "amount": 1000,
        "label": "Some Label",
        "intervalCount": 7,
        "intervalUnit": "day",
        "startDate": "2020-01-05",
        "endDate": "2020-10-15"
      ],
      "trialBilling": [
        "amount": 10.5,
        "label": "Some Label",
        "intervalCount": 5,
        "intervalUnit": "year",
        "startDate": "2020-01-05T10:55:20",
        "endDate": "2020-10-15T10:55:20"
      ],
      "managementURL" : "https://some-domain.com",
      "tokenNotificationURL": "https://some-other-domain.com",
      "billingAgreement": "Some billing agreement"
    ])

    XCTAssertEqual(sut.paymentDescription, "Some description")

    let regularBilling = try XCTUnwrap(sut.regularBilling)
    XCTAssertEqual(regularBilling.label, "Some Label")
    XCTAssertEqual(regularBilling.amount, 1000)
    XCTAssertEqual(regularBilling.intervalUnit, .day)
    XCTAssertEqual(regularBilling.intervalCount, 7)
    XCTAssertEqual(regularBilling.startDate, iso8601Formatter.date(from: "2020-01-05"))
    XCTAssertEqual(regularBilling.endDate, iso8601Formatter.date(from: "2020-10-15"))

    let trialBilling = try XCTUnwrap(sut.trialBilling)
    XCTAssertEqual(trialBilling.label, "Some Label")
    XCTAssertEqual(trialBilling.amount, 10.5)
    XCTAssertEqual(trialBilling.intervalUnit, .year)
    XCTAssertEqual(trialBilling.intervalCount, 5)
    XCTAssertEqual(trialBilling.startDate, iso8601Formatter.date(from: "2020-01-05T10:55:20"))
    XCTAssertEqual(trialBilling.endDate, iso8601Formatter.date(from: "2020-10-15T10:55:20"))

    XCTAssertEqual(sut.managementURL?.absoluteString, "https://some-domain.com")
    XCTAssertEqual(sut.tokenNotificationURL?.absoluteString, "https://some-other-domain.com")
    XCTAssertEqual(sut.billingAgreement, "Some billing agreement")
  }

}

