//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import XCTest
@_spi(AdyenInternal) import Adyen
@testable import adyen_react_native

final class BaseAddressLookupTests: XCTestCase {

    var sut: TestableBaseAddressLookup!
    var mockEmitter: MockEmitter!

    override func setUp() {
        super.setUp()
        mockEmitter = MockEmitter()
        sut = TestableBaseAddressLookup()
        sut.emitterOverride = mockEmitter
    }

    override func tearDown() {
        sut = nil
        mockEmitter = nil
        super.tearDown()
    }

    // MARK: - sendAddressUpdate Tests

    func test_sendAddressUpdate_emitsUpdateAddressEvent() {
        // GIVEN
        let searchTerm = "123 Main St"

        // WHEN
        sut.sendAddressUpdate(searchTerm: searchTerm)

        // THEN
        XCTAssertEqual(mockEmitter.events.count, 1)
        XCTAssertEqual(mockEmitter.events[0].name, Events.updateAddress.rawValue)
        XCTAssertEqual(mockEmitter.events[0].body as? String, searchTerm)
    }

    // MARK: - sendAddressConfirm Tests

    func test_sendAddressConfirm_emitsConfirmAddressEvent() {
        // GIVEN
        let addressJson: [String: Any] = [
            "street": "Main St",
            "houseNumberOrName": "123",
            "city": "Amsterdam",
            "postalCode": "1012AB",
            "country": "NL"
        ]

        // WHEN
        sut.sendAddressConfirm(json: addressJson)

        // THEN
        XCTAssertEqual(mockEmitter.events.count, 1)
        XCTAssertEqual(mockEmitter.events[0].name, Events.confirmAddress.rawValue)
        let body = mockEmitter.events[0].body as? [String: Any]
        XCTAssertEqual(body?["street"] as? String, "Main St")
        XCTAssertEqual(body?["city"] as? String, "Amsterdam")
    }

    // MARK: - update Tests

    func test_update_callsLookupHandler() {
        // GIVEN
        let expectation = self.expectation(description: "lookupHandler called")
        var receivedAddresses: [LookupAddressModel]?

        sut.lookupHandler = { addresses in
            receivedAddresses = addresses
            expectation.fulfill()
        }

        let results: NSArray = [
            [
                "id": "addr1",
                "address": [
                    "street": "Main St",
                    "houseNumberOrName": "123",
                    "city": "Amsterdam",
                    "postalCode": "1012AB",
                    "country": "NL"
                ]
            ] as NSDictionary
        ]

        // WHEN
        sut.update(results)

        // THEN
        wait(for: [expectation], timeout: 1.0)
        XCTAssertEqual(receivedAddresses?.count, 1)
        XCTAssertEqual(receivedAddresses?[0].postalAddress.street, "Main St")
    }

    func test_update_withNoHandler_doesNothing() {
        // GIVEN
        sut.lookupHandler = nil
        let results: NSArray = [["id": "addr1"] as NSDictionary]

        // WHEN/THEN - should not crash
        sut.update(results)
    }

    // MARK: - confirm Tests

    func test_confirm_success_callsCompletionHandler() {
        // GIVEN
        let expectation = self.expectation(description: "completionHandler called")
        var receivedResult: Result<PostalAddress, Error>?

        sut.lookupCompletionHandler = { result in
            receivedResult = result
            expectation.fulfill()
        }

        let address: NSDictionary = [
            "id": "addr1",
            "address": [
                "street": "Main St",
                "houseNumberOrName": "123",
                "city": "Amsterdam",
                "postalCode": "1012AB",
                "country": "NL"
            ]
        ]

        // WHEN
        sut.confirm(NSNumber(value: true), address: address)

        // THEN
        wait(for: [expectation], timeout: 1.0)
        if case let .success(postalAddress) = receivedResult {
            XCTAssertEqual(postalAddress.street, "Main St")
            XCTAssertEqual(postalAddress.city, "Amsterdam")
        } else {
            XCTFail("Expected success result")
        }
    }

    func test_confirm_failure_callsCompletionHandlerWithError() {
        // GIVEN
        let expectation = self.expectation(description: "completionHandler called")
        var receivedResult: Result<PostalAddress, Error>?

        sut.lookupCompletionHandler = { result in
            receivedResult = result
            expectation.fulfill()
        }

        let errorAddress: NSDictionary = [
            "message": "Address not found"
        ]

        // WHEN
        sut.confirm(NSNumber(value: false), address: errorAddress)

        // THEN
        wait(for: [expectation], timeout: 1.0)
        if case let .failure(error) = receivedResult {
            XCTAssertEqual(error.localizedDescription, "Address not found")
        } else {
            XCTFail("Expected failure result")
        }
    }

    func test_confirm_withNoHandler_doesNothing() {
        // GIVEN
        sut.lookupCompletionHandler = nil
        let address: NSDictionary = ["id": "addr1"]

        // WHEN/THEN - should not crash
        sut.confirm(NSNumber(value: true), address: address)
    }

    // MARK: - cleanUp Tests

    func test_cleanUp_clearsHandlers() {
        // GIVEN
        sut.lookupHandler = { _ in }
        sut.lookupCompletionHandler = { _ in }

        // WHEN
        sut.cleanUp()

        // THEN
        XCTAssertNil(sut.lookupHandler)
        XCTAssertNil(sut.lookupCompletionHandler)
    }

    // MARK: - AddressLookupProvider Tests

    func test_lookUp_setsHandlerAndSendsEvent() {
        // GIVEN
        var handlerCalled = false

        // WHEN
        sut.lookUp(searchTerm: "test") { _ in
            handlerCalled = true
        }

        // THEN
        XCTAssertNotNil(sut.lookupHandler)
        XCTAssertEqual(mockEmitter.events.count, 1)
        XCTAssertEqual(mockEmitter.events[0].name, Events.updateAddress.rawValue)

        // Verify handler is stored correctly
        sut.lookupHandler?([])
        XCTAssertTrue(handlerCalled)
    }

    func test_complete_setsHandlerAndSendsEvent() {
        // GIVEN
        var handlerCalled = false
        let address = LookupAddressModel(
            identifier: "addr1",
            postalAddress: PostalAddress(
                city: "Amsterdam",
                country: "NL",
                houseNumberOrName: "123",
                postalCode: "1012AB",
                street: "Main St"
            )
        )

        // WHEN
        sut.complete(incompleteAddress: address) { _ in
            handlerCalled = true
        }

        // THEN
        XCTAssertNotNil(sut.lookupCompletionHandler)
        XCTAssertEqual(mockEmitter.events.count, 1)
        XCTAssertEqual(mockEmitter.events[0].name, Events.confirmAddress.rawValue)

        // Verify handler is stored correctly
        sut.lookupCompletionHandler?(.success(PostalAddress()))
        XCTAssertTrue(handlerCalled)
    }
}

// MARK: - Testable Subclass

final class TestableBaseAddressLookup: BaseAddressLookup {
    override init() {
        super.init()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}
