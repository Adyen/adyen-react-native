//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Foundation
import PassKit
import React

@objc(AdyenApplePay)
internal final class ApplePayModule: BaseModule {

    override func supportedEvents() -> [String]! { [ Events.didSubmit.rawValue, Events.didFail.rawValue ] }

    @objc
    func hide(_ success: NSNumber, event: NSDictionary) {
        dismiss(success.boolValue)
    }

    @objc
    func open(_ paymentMethodsDict: NSDictionary, configuration: NSDictionary) {
        let parser = RootConfigurationParser(configuration: configuration)
        let applePayParser = ApplepayConfigurationParser(configuration: configuration)
        let paymentMethod: ApplePayPaymentMethod
        let clientKey: String
        let payment: Payment
        let applepayConfig: Adyen.ApplePayComponent.Configuration
        do {
            paymentMethod = try parsePaymentMethod(from: paymentMethodsDict, for: ApplePayPaymentMethod.self)
            clientKey = try fetchClientKey(from: parser)
            payment = try fetchPayment(from: parser)
            applepayConfig = try applePayParser.buildConfiguration(payment: payment)
        } catch {
            return sendEvent(error: error)
        }

        guard let apiContext = try? APIContext(environment: parser.environment, clientKey: clientKey) else { return }

        // TODO: add analyticsConfiguration: AnalyticsConfiguration()
        let context = AdyenContext(apiContext: apiContext, payment: payment)
        let applePayComponent: Adyen.ApplePayComponent
        do {
            applePayComponent = try Adyen.ApplePayComponent(paymentMethod: paymentMethod,
                                                            context: context,
                                                            configuration: applepayConfig)
        } catch {
            return sendEvent(error: error)
        }

        present(component: applePayComponent)
    }

}

extension ApplePayModule: PaymentComponentDelegate {

    internal func didSubmit(_ data: PaymentComponentData, from component: PaymentComponent) {
        let applePayDetails = data.paymentMethod as? ApplePayDetails
        let response = SubmitData(paymentData: data.jsonObject, extra: applePayDetails?.extraData)
        sendEvent(event: .didSubmit, body: response.jsonObject)
    }

    internal func didFail(with error: Error, from component: PaymentComponent) {
        sendEvent(error: error)
    }

}

extension ApplePayDetails {

    private enum Key {
        static let billingContact = "billingContact"
        static let network = "network"
        static let shippingContact = "shippingContact"
    }

    internal var extraData: [String: Any] {
        return [
            Key.billingContact: self.billingContact?.jsonObject,
            Key.network: self.network,
            Key.shippingContact: self.shippingContact?.jsonObject
        ]
    }
}

extension PKContact {
    var jsonObject: [String: Any] {
        var dictionary: [String: Any] = [:]

        if let email = self.emailAddress {
            dictionary[ApplePayKeys.PKContactKeys.emailAddress] = email
        }

        if let phoneNumber = self.phoneNumber {
            dictionary[ApplePayKeys.PKContactKeys.phoneNumber] = phoneNumber.stringValue
        }

        if let name = self.name {
            dictionary[ApplePayKeys.PKContactKeys.givenName] = name.givenName
            dictionary[ApplePayKeys.PKContactKeys.familyName] = name.familyName
        }

        if let name = self.name?.phoneticRepresentation {
            dictionary[ApplePayKeys.PKContactKeys.phoneticGivenName] = name.givenName
            dictionary[ApplePayKeys.PKContactKeys.phoneticFamilyName] = name.familyName
        }

        if let postalAddress = self.postalAddress {
            dictionary[ApplePayKeys.PKContactKeys.addressLines] = postalAddress.street
            dictionary[ApplePayKeys.PKContactKeys.subLocality] = postalAddress.subLocality
            dictionary[ApplePayKeys.PKContactKeys.locality] = postalAddress.city
            dictionary[ApplePayKeys.PKContactKeys.postalCode] = postalAddress.postalCode
            dictionary[ApplePayKeys.PKContactKeys.subAdministrativeArea] = postalAddress.subAdministrativeArea
            dictionary[ApplePayKeys.PKContactKeys.administrativeArea] = postalAddress.state
            dictionary[ApplePayKeys.PKContactKeys.country] = postalAddress.country
            dictionary[ApplePayKeys.PKContactKeys.countryCode] = postalAddress.isoCountryCode
        }

        return dictionary
    }
}
