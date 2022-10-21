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
            applepayConfig = try applePayParser.buildConfiguration(amount: payment.amount)
        } catch {
            return sendEvent(error: error)
        }
        

        let apiContext = APIContext(environment: parser.environment, clientKey: clientKey)
        let applePayComponent: Adyen.ApplePayComponent
        do {
            applePayComponent = try Adyen.ApplePayComponent(paymentMethod: paymentMethod,
                                                        apiContext: apiContext,
                                                        payment: payment,
                                                        configuration: applepayConfig)
        } catch {
            return sendEvent(error: error)
        }

        present(component: applePayComponent)
    }

}

extension ApplePayComponent: PaymentComponentDelegate {

    internal func didSubmit(_ data: PaymentComponentData, from component: PaymentComponent) {
        sendEvent(event: .didSubmit, body: data.jsonObject)
    }

    internal func didFail(with error: Error, from component: PaymentComponent) {
        sendEvent(error: error)
    }

}
