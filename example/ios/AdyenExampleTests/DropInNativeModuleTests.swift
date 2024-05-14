//
// Copyright (c) 2024 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
@testable import adyen_react_native
import XCTest

final class DropInNativeModuleTests: XCTestCase {

  let shortPaymentMethods: NSDictionary = ["paymentMethods": [
    [
      "type": "scheme",
      "name": "Cards"
    ],
    [
      "type": "klarna",
      "name": "Klarna"
    ],
  ]]

  let fullPaymentMethods: NSDictionary = [
    "paymentMethods": [
      [
        "type": "scheme",
        "name": "Cards"
      ],
      [
        "type": "klarna",
        "name": "Klarna"
      ],
    ],
    "storedPaymentMethods": [
      [
        "brand": "visa",
        "expiryMonth": "03",
        "expiryYear": "30",
        "id": "J469JCZC5KPBGP65",
        "lastFour": "6746",
        "name": "VISA",
        "supportedShopperInteractions": [
          "Ecommerce",
          "ContAuth"
        ],
        "type": "scheme"
      ],
    ]
  ]


  func testSimpleList() throws {
      // GIVEN
    let sut = DropInModule()
    let config: NSDictionary = ["clientKey": "live_XXXXXXXXXX"]


      // WHEN
    sut.open(shortPaymentMethods, configuration: config)

      // THEN
    XCTAssertTrue(try isPresentingDropIn())

    let topView = try XCTUnwrap(getDropInView() as? UITableViewController)
    XCTAssertEqual(getNumberOfElement(in: topView.tableView, section: 0), 2)
    XCTAssertEqual(topView.title, "Payment Methods")

    // TEAR DOWN
    dissmissDropIn()
  }

  func testStoredList() throws {
      // GIVEN
    let sut = DropInModule()
    let config: NSDictionary = [
      "clientKey": "live_XXXXXXXXXX",
    ]

      // WHEN
    sut.open(fullPaymentMethods, configuration: config)

      // THEN
    XCTAssertTrue(try isPresentingDropIn())

    let topView = try XCTUnwrap(getDropInView())
    XCTAssertEqual(topView.title, "AdyenExample")

    // TEAR DOWN
    dissmissDropIn()
  }

  func testTitleSetter() throws {
      // GIVEN
    let sut = DropInModule()
    let config: NSDictionary = [
      "clientKey": "live_XXXXXXXXXX",
      "dropin": [
        "title": "MY_TITLE"
      ]
    ]

      // WHEN
    sut.open(fullPaymentMethods, configuration: config)

      // THEN
    XCTAssertTrue(try isPresentingDropIn())

    let topView = try XCTUnwrap(getDropInView())
    XCTAssertEqual(topView.title, "MY_TITLE")

    // TEAR DOWN
    dissmissDropIn()
  }

  func testSkipingPreset() throws {
      // GIVEN
    let sut = DropInModule()
    let config: NSDictionary = [
      "clientKey": "live_XXXXXXXXXX",
      "dropin": [
        "showPreselectedStoredPaymentMethod": false
      ]
    ]

      // WHEN
    sut.open(fullPaymentMethods, configuration: config)

      // THEN
    XCTAssertTrue(try isPresentingDropIn())

    let topView = try XCTUnwrap(getDropInView() as? UITableViewController)
    XCTAssertEqual(getNumberOfElement(in: topView.tableView, section: 0), 1)
    XCTAssertEqual(getNumberOfElement(in: topView.tableView, section: 1), 2)
    XCTAssertEqual(topView.title, "Payment Methods")

    // TEAR DOWN
    dissmissDropIn()
  }

  func isPresentingDropIn() throws -> Bool {
    let dropin = try waitUntilTopPresenter(isOfType: UINavigationController.self)
    return dropin is AdyenObserver
  }

  func getDropInView() -> UIViewController? {

    var controller: UIViewController?
    var nextController: UIViewController? = UIApplication.shared.keyWindow?.rootViewController?.presentedViewController

    while nextController != nil {
      controller = nextController
      nextController = nextController?.children.first
    }
    return controller
  }

  func getNumberOfElement(in tableView: UITableView, section: Int) -> Int? {
    tableView.dataSource?.tableView(tableView, numberOfRowsInSection: section)
  }

  func dissmissDropIn() {
    let expectation = expectation(description: "DropIn closing")
    UIApplication.shared.keyWindow?.rootViewController?.dismiss(animated: false, completion: {
      expectation.fulfill()
    })
    wait(for: [expectation])
  }

}
