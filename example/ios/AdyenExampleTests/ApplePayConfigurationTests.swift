//
// Copyright (c) 2023 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
@testable import adyen_react_native
import PassKit
import XCTest

final class ApplePayConfigurationTests: XCTestCase {

    let mockAmount = Amount(value: 1000, currencyCode: "USD", localeIdentifier: "en-US")
    lazy var mockPayment = Payment(amount: mockAmount, countryCode: "US")
    let contactDetails: [String: Any] = [
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

    func test_initialization_succeeds_withNewDictionary() throws {
        // GIVEN
        let configDict = NSDictionary()
        
        // WHEN
        let sut = ApplepayConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertNotNil(sut)
        XCTAssertFalse(sut.allowOnboarding)
    }

    func test_initialization_succeeds_withEmptyDictionary() throws {
        // GIVEN
        let configDict: NSDictionary = [:]
        
        // WHEN
        let sut = ApplepayConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertNotNil(sut)
    }

    func test_buildConfiguration_throwsInvalidMerchantID_withEmptySubDictionary() throws {
        // GIVEN
        let configDict: NSDictionary = ["applepay": [:]]

        // WHEN
        let sut = ApplepayConfigurationParser(configuration: configDict)

        // THEN
        XCTAssertNotNil(sut)
        let expectation = self.expectation(description: "Expect throw")
        XCTAssertThrowsError(try sut.buildConfiguration(payment: mockPayment)) { error in
            XCTAssertEqual(error.localizedDescription, ApplepayConfigurationParser.ApplePayError.invalidMerchantID.localizedDescription)
            expectation.fulfill()
        }

        self.wait(for: [expectation], timeout: 1)
    }

    func test_buildConfiguration_throwsInvalidMerchantID_withWrongSubDictionary() throws {
        // GIVEN
        let configDict: NSDictionary = ["applepay": "some value"]

        // WHEN
        let sut = ApplepayConfigurationParser(configuration: configDict)
        
        // THEN
        let expectation = self.expectation(description: "Expect throw")
        XCTAssertThrowsError(try sut.buildConfiguration(payment: mockPayment)) { error in
            XCTAssertEqual(error.localizedDescription, ApplepayConfigurationParser.ApplePayError.invalidMerchantID.localizedDescription)
            expectation.fulfill()
        }

        self.wait(for: [expectation], timeout: 1)
    }

    func test_buildConfiguration_throwsInvalidMerchantName_whenMerchantNameMissing() throws {
        // GIVEN
        let configDict: NSDictionary = [
            "applepay": [
                "merchantID": "someID"
            ]
        ]

        // WHEN
        let sut = ApplepayConfigurationParser(configuration: configDict)

        // THEN
        let expectation = self.expectation(description: "Expect throw")
        XCTAssertThrowsError(try sut.buildConfiguration(payment: mockPayment)) { error in
            XCTAssertEqual(error.localizedDescription, ApplepayConfigurationParser.ApplePayError.invalidMerchantName.localizedDescription)
            expectation.fulfill()
        }

        self.wait(for: [expectation], timeout: 1)
    }

    func test_buildPaymentRequest_createsValidRequest_withMinimalValidConfiguration() throws {
        // GIVEN
        let configDict: NSDictionary = [
            "applepay": [
                "merchantID": "merchant.com.adyen.test",
                "merchantName": "SomeName"
            ]
        ]
        let sut = ApplepayConfigurationParser(configuration: configDict)
        
        // WHEN
        let paymentRequest = try sut.buildPaymentRequest(payment: mockPayment)
        
        // THEN
        XCTAssertNotNil(paymentRequest.merchantIdentifier)
        XCTAssertNotNil(paymentRequest.paymentSummaryItems)
        XCTAssertEqual(paymentRequest.paymentSummaryItems.count, 1)
    }

    func test_buildPaymentRequest_createsValidRequest_withNoSubDirectory() throws {
        // GIVEN
        let configDict: NSDictionary = [
            "merchantID": "merchant.com.adyen.test",
            "merchantName": "SomeName"
        ]
        let sut = ApplepayConfigurationParser(configuration: configDict)
        
        // WHEN
        let paymentRequest = try sut.buildPaymentRequest(payment: mockPayment)
        
        // THEN
        XCTAssertNotNil(paymentRequest.merchantIdentifier)
        XCTAssertNotNil(paymentRequest.paymentSummaryItems)
        XCTAssertEqual(paymentRequest.paymentSummaryItems.count, 1)
    }

    func test_buildPaymentRequest_createsSummaryItems_withCorrectConfiguration() throws {
        // GIVEN
        let configDict: NSDictionary = [
            "applepay": [
                "merchantID": "merchant.com.adyen.test",
                "summaryItems": [
                    [
                        "label": "Item 1",
                        "amount": "70.20",
                        "type": "pending"
                    ],
                    [
                        "label": "Item 2",
                        "amount": "-20",
                        "type": "final"
                    ],
                    [
                        "label": "Item 3",
                        "amount": 10
                    ],
                    [
                        "label": "Total",
                        "amount": 100.50
                    ]
                ]
            ]
        ]
        let sut = ApplepayConfigurationParser(configuration: configDict)
        
        // WHEN
        let paymentRequest = try sut.buildPaymentRequest(payment: mockPayment)
        
        // THEN
        XCTAssertNotNil(paymentRequest.merchantIdentifier)
        XCTAssertNotNil(paymentRequest.paymentSummaryItems)
        XCTAssertEqual(paymentRequest.paymentSummaryItems.count, 4)
        XCTAssertEqual(paymentRequest.paymentSummaryItems[0].amount, 70.20)
        XCTAssertEqual(paymentRequest.paymentSummaryItems[0].type, .pending)
        XCTAssertEqual(paymentRequest.paymentSummaryItems[1].amount, -20)
        XCTAssertEqual(paymentRequest.paymentSummaryItems[1].type, .final)
        XCTAssertEqual(paymentRequest.paymentSummaryItems[2].amount, 10)
        XCTAssertEqual(paymentRequest.paymentSummaryItems[3].amount, 100.50)
    }

    func test_buildConfiguration_throwsInvalidMerchantName_withEmptySummaryItems() throws {
        // GIVEN
        let configDict: NSDictionary = ["applepay": [
            "merchantID": "merchant.com.adyen.test",
            "summaryItems": []
        ]]

        // WHEN
        let sut = ApplepayConfigurationParser(configuration: configDict)
        
        // THEN
        let expectation = self.expectation(description: "Expect throw")
        XCTAssertThrowsError(try sut.buildConfiguration(payment: mockPayment)) { error in
            XCTAssertEqual(error.localizedDescription, ApplepayConfigurationParser.ApplePayError.invalidMerchantName.localizedDescription)
            expectation.fulfill()
        }

        self.wait(for: [expectation], timeout: 1)
    }

    func test_allowOnboarding_returnsTrue_whenConfiguredWithBoolValue() throws {
        // GIVEN
        let configDict: NSDictionary = [
            "applepay": [
                "merchantID": "merchant.com.adyen.test",
                "merchantName": "SomeName",
                "allowOnboarding": true
            ]
        ]
        
        // WHEN
        let sut = ApplepayConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertTrue(sut.allowOnboarding)
    }

    func test_allowOnboarding_returnsTrue_whenConfiguredWithStringValue() throws {
        // GIVEN
        let configDict: NSDictionary = [
            "applepay": [
                "merchantID": "merchant.com.adyen.test",
                "merchantName": "SomeName",
                "allowOnboarding": "true"
            ]
        ]
        
        // WHEN
        let sut = ApplepayConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertTrue(sut.allowOnboarding)
    }

    func test_allowOnboarding_returnsTrue_whenConfiguredWithNumericValue() throws {
        // GIVEN
        let configDict: NSDictionary = [
            "applepay": [
                "merchantID": "merchant.com.adyen.test",
                "merchantName": "SomeName",
                "allowOnboarding": 1
            ]
        ]
        
        // WHEN
        let sut = ApplepayConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertTrue(sut.allowOnboarding)
    }

    fileprivate func testContactDetails(_ contact: PKContact) {
        // THEN
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
  
    func test_billingContact_parsesAllFields_whenFullyConfigured() throws {
        // GIVEN
        let configDict: NSDictionary = [
            "applepay": [
                "merchantID": "merchant.com.adyen.test",
                "merchantName": "SomeName",
                "billingContact": contactDetails
            ]
        ]
        
        // WHEN
        let sut = ApplepayConfigurationParser(configuration: configDict)

        // THEN
        let contact = try XCTUnwrap(sut.billingContact)
        testContactDetails(contact)
    }

    func test_shippingContact_parsesAllFields_whenFullyConfigured() throws {
        // GIVEN
        let configDict: NSDictionary = [
            "applepay": [
                "merchantID": "merchant.com.adyen.test",
                "merchantName": "SomeName",
                "shippingContact": contactDetails
            ]
        ]
        
        // WHEN
        let sut = ApplepayConfigurationParser(configuration: configDict)

        // THEN
        let contact = try XCTUnwrap(sut.shippingContact)
        testContactDetails(contact)
    }

    func test_billingContact_handlesPartialData_withoutPhoneticNameAndAddress() throws {
        // GIVEN
        let configDict: NSDictionary = [
            "applepay": [
                "merchantID": "merchant.com.adyen.test",
                "merchantName": "SomeName",
                "billingContact": [
                    "phoneNumber": "123-456-7890",
                    "givenName": "John",
                    "familyName": "Doe"
                ]
            ]
        ]
        
        // WHEN
        let sut = ApplepayConfigurationParser(configuration: configDict)

        // THEN
        let contact = try XCTUnwrap(sut.billingContact)
        XCTAssertEqual(contact.phoneNumber?.stringValue, "123-456-7890")
        XCTAssertNil(contact.emailAddress)
        XCTAssertEqual(contact.name?.givenName, "John")
        XCTAssertEqual(contact.name?.familyName, "Doe")
        XCTAssertNil(contact.name?.phoneticRepresentation)
        XCTAssertNil(contact.postalAddress)
        XCTAssertNil(contact.emailAddress)
    }

    func test_billingContact_handlesPartialData_withoutName() throws {
        // GIVEN
        let configDict: NSDictionary = [
            "applepay": [
                "merchantID": "merchant.com.adyen.test",
                "merchantName": "SomeName",
                "billingContact": [
                    "emailAddress": "example@email.com",
                    "phoneticGivenName": "John",
                    "phoneticFamilyName": "Doe"
                ]
            ]
        ]
        
        // WHEN
        let sut = ApplepayConfigurationParser(configuration: configDict)

        // THEN
        let contact = try XCTUnwrap(sut.billingContact)
        XCTAssertNil(contact.phoneNumber)
        XCTAssertEqual(contact.emailAddress, "example@email.com")
        XCTAssertNil(contact.name?.givenName)
        XCTAssertNil(contact.name?.familyName)
        XCTAssertEqual(contact.name?.phoneticRepresentation?.givenName, "John")
        XCTAssertEqual(contact.name?.phoneticRepresentation?.familyName, "Doe")
    }

    func test_requiredBillingContactFields_returnsEmpty_whenConfiguredWithEmptyArray() throws {
        // GIVEN
        let configDict: NSDictionary = [
            "applepay": [
                "merchantID": "merchant.com.adyen.test",
                "merchantName": "SomeName",
                "requiredBillingContactFields": []
            ]
        ]
        let sut = ApplepayConfigurationParser(configuration: configDict)
        
        // WHEN
        let paymentRequest = try sut.buildPaymentRequest(payment: mockPayment)
        
        // THEN
        XCTAssertEqual(paymentRequest.requiredBillingContactFields.count, 0)
    }

    func test_requiredBillingContactFields_returnsCorrectFields_whenProvided() throws {
        // GIVEN
        let configDict: NSDictionary = [
            "applepay": [
                "merchantID": "merchant.com.adyen.test",
                "merchantName": "SomeName",
                "requiredBillingContactFields": ["emailAddress", "phoneNumber", "postalAddress"]
            ]
        ]
        let sut = ApplepayConfigurationParser(configuration: configDict)
        
        // WHEN
        let paymentRequest = try sut.buildPaymentRequest(payment: mockPayment)
        
        // THEN
        XCTAssertEqual(paymentRequest.requiredBillingContactFields.count, 3)
        XCTAssertTrue(paymentRequest.requiredBillingContactFields.contains(.phoneNumber))
        XCTAssertTrue(paymentRequest.requiredBillingContactFields.contains(.emailAddress))
        XCTAssertTrue(paymentRequest.requiredBillingContactFields.contains(.postalAddress))
    }

    func test_requiredBillingContactFields_parsesCorrectFields_includingAliases() throws {
        // GIVEN
        let configDict: NSDictionary = [
            "applepay": [
                "merchantID": "merchant.com.adyen.test",
                "merchantName": "SomeName",
                "requiredBillingContactFields": ["phone", "email", "post", "invalid"]
            ]
        ]
        let sut = ApplepayConfigurationParser(configuration: configDict)

        // WHEN
        let paymentRequest = try sut.buildPaymentRequest(payment: mockPayment)

        // THEN
        XCTAssertEqual(paymentRequest.requiredBillingContactFields.count, 4)
        XCTAssertTrue(paymentRequest.requiredBillingContactFields.contains(.phoneNumber))
        XCTAssertTrue(paymentRequest.requiredBillingContactFields.contains(.emailAddress))
        XCTAssertTrue(paymentRequest.requiredBillingContactFields.contains(.postalAddress))
    }

    func test_requiredShippingContactFields_returnsCorrectFields_whenProvided() throws {
        // GIVEN
        let configDict: NSDictionary = [
            "applepay": [
                "merchantID": "merchant.com.adyen.test",
                "merchantName": "SomeName",
                "requiredShippingContactFields": ["emailAddress", "phoneNumber", "phoneticName", "name", "postalAddress"]
            ]
        ]
        let sut = ApplepayConfigurationParser(configuration: configDict)
        
        // WHEN
        let paymentRequest = try sut.buildPaymentRequest(payment: mockPayment)
        
        // THEN
        XCTAssertEqual(paymentRequest.requiredShippingContactFields.count, 5)
        XCTAssertTrue(paymentRequest.requiredShippingContactFields.contains(.phoneNumber))
        XCTAssertTrue(paymentRequest.requiredShippingContactFields.contains(.emailAddress))
        XCTAssertTrue(paymentRequest.requiredShippingContactFields.contains(.name))
        XCTAssertTrue(paymentRequest.requiredShippingContactFields.contains(.phoneticName))
        XCTAssertTrue(paymentRequest.requiredShippingContactFields.contains(.postalAddress))
    }

    func test_shippingType_returnsCorrectValue_whenConfigured() {
        // GIVEN
        let configDict: NSDictionary = ["applepay": [
            "merchantID": "merchant.com.adyen.test",
            "merchantName": "SomeName",
            "shippingType": "servicePickup"
        ]]
        
        // WHEN
        let parser = ApplepayConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertEqual(parser.shippingType, PKShippingType.servicePickup)
    }

    func test_supportedCountries_returnsCorrectValues_whenConfigured() {
        // GIVEN
        let configDict: NSDictionary = ["applepay": [
            "merchantID": "merchant.com.adyen.test",
            "merchantName": "SomeName",
            "supportedCountries": ["US", "CA"]
        ]]
        
        // WHEN
        let parser = ApplepayConfigurationParser(configuration: configDict)
        
        // THEN
        XCTAssertEqual(parser.supportedCountries, Set(["US", "CA"]))
    }

    func test_shippingMethods_parsesCorrectValues_whenConfigured() {
        // GIVEN
        let configDict: NSDictionary = ["applepay": [
            "merchantID": "merchant.com.adyen.test",
            "merchantName": "SomeName 1",
            "shippingMethods": [
                [
                    "label": "Label 1",
                    "amount": 10.1,
                    "type": "pending",
                    "detail": "Detail 1",
                    "identifier": "Identifier 1",
                    "startDate": "2025-01-01",
                    "endDate": "2025-01-02"
                ],
                [
                    "label": "Label 2",
                    "amount": "10.1",
                    "detail": "Detail 2",
                    "identifier": "Identifier 2",
                    "startDate": "2025-02-05T00:00:00Z",
                    "endDate": "2025-03-10T00:00:00Z"
                ]
            ]
        ]]
        
        // WHEN
        let parser = ApplepayConfigurationParser(configuration: configDict)

        // THEN
        let shippingMethods = parser.shippingMethods
        XCTAssertNotNil(shippingMethods)
        XCTAssertEqual(shippingMethods?.count, 2)

        var shippingMethod = shippingMethods![0]
        XCTAssertEqual(shippingMethod.label, "Label 1")
        XCTAssertEqual(shippingMethod.amount, NSDecimalNumber(string: "10.1"))
        XCTAssertEqual(shippingMethod.type, .pending)
        XCTAssertEqual(shippingMethod.detail, "Detail 1")
        XCTAssertEqual(shippingMethod.identifier, "Identifier 1")
        if #available(iOS 15.0, *) {
            XCTAssertEqual(shippingMethod.dateComponentsRange?.startDateComponents.year, 2025)
            XCTAssertEqual(shippingMethod.dateComponentsRange?.startDateComponents.month, 1)
            XCTAssertEqual(shippingMethod.dateComponentsRange?.startDateComponents.day, 1)
        }

        shippingMethod = shippingMethods![1]
        XCTAssertEqual(shippingMethod.label, "Label 2")
        XCTAssertEqual(shippingMethod.amount, NSDecimalNumber(string: "10.1"))
        XCTAssertEqual(shippingMethod.type, .final)
        XCTAssertEqual(shippingMethod.detail, "Detail 2")
        XCTAssertEqual(shippingMethod.identifier, "Identifier 2")
        if #available(iOS 15.0, *) {
            XCTAssertEqual(shippingMethod.dateComponentsRange?.endDateComponents.year, 2025)
            XCTAssertEqual(shippingMethod.dateComponentsRange?.endDateComponents.month, 3)
            XCTAssertEqual(shippingMethod.dateComponentsRange?.endDateComponents.day, 10)
        }
    }

    @available(iOS 16.0, *)
    func test_recurringPaymentRequest_isConfigured_whenProvided() throws {
        // GIVEN
        let configDict: NSDictionary = [
            "applepay": [
                "merchantID": "merchant.com.adyen.test",
                "merchantName": "SomeName",
                "recurringPaymentRequest": [
                    "description": "Some description",
                    "regularBilling": ["amount": 1000, "label": "Some Label"],
                    "managementURL": "https://some-domain.com"
                ]
            ]
        ]
        let sut = ApplepayConfigurationParser(configuration: configDict)
        
        // WHEN
        let paymentRequest = try sut.buildPaymentRequest(payment: mockPayment)
        
        // THEN
        XCTAssertNotNil(paymentRequest.recurringPaymentRequest)
    }

}
