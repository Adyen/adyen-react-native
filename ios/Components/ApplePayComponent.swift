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
final internal class ApplePayComponent: BaseModule {

    override func supportedEvents() -> [String]! { super.supportedEvents() }
    @objc
    func hide(_ success: NSNumber, event: NSDictionary) {
        DispatchQueue.main.async {[weak self] in
            guard let self = self else { return }

            self.currentComponent?.finalizeIfNeeded(with: success.boolValue) {
                self.cleanUp()
            }
        }
    }

    @objc
    func open(_ paymentMethodsDict: NSDictionary, configuration: NSDictionary) {
        let paymentMethod: ApplePayPaymentMethod
        do {
            paymentMethod = try parsePaymentMethod(from: paymentMethodsDict, for: ApplePayPaymentMethod.self)
        } catch {
            return assertionFailure("ApplePayComponent: \(error.localizedDescription)")
        }

        let parser = RootConfigurationParser(configuration: configuration)
        guard let clientKey = parser.clientKey else {
            return assertionFailure("ApplePayComponent: No clientKey in configuration")
        }
        
        guard let payment = parser.payment else {
            return assertionFailure("ApplePayComponent: No payment in configuration")
        }
        
        guard let applepayConfig = ApplepayConfigurationParser(configuration: configuration).tryConfiguration(amount: payment.amount) else {
            return assertionFailure("ApplePayComponent: No payment in configuration")
        }

        let apiContext = APIContext(environment: parser.environment, clientKey: clientKey)
        let applePayComponent: Adyen.ApplePayComponent
        do {
            applePayComponent = try Adyen.ApplePayComponent(paymentMethod: paymentMethod,
                                                        apiContext: apiContext,
                                                        payment: payment,
                                                        configuration: applepayConfig)
        } catch {
            return assertionFailure("ApplePayComponent: \(error.localizedDescription)")
        }

        present(component: applePayComponent)
    }

}

extension ApplePayComponent: PaymentComponentDelegate {

    internal func didSubmit(_ data: PaymentComponentData, from component: PaymentComponent) {
        sendEvent(event: .didSubmit, body: data.jsonObject)
    }

    internal func didFail(with error: Error, from component: PaymentComponent) {
        sendEvent(event: .didFail, body: error.toDictionary)
    }

}
