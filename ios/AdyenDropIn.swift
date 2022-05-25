//
// Copyright (c) 2021 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Foundation
import PassKit
import React

@objc(AdyenDropIn)
internal class AdyenDropIn: BaseModule {

    private var dropInComponent: DropInComponent?

    @objc
    override static func requiresMainQueueSetup() -> Bool { true }
    override func stopObserving() {}
    override func startObserving() {}
    override func supportedEvents() -> [String]! { super.supportedEvents() }

    @objc
    func hide(_ success: NSNumber, event: NSDictionary) {
        DispatchQueue.main.async {
            self.dropInComponent?.finalizeIfNeeded(with: success.boolValue)
            UIApplication.shared.keyWindow?.rootViewController?.dismiss(animated: true)
            self.dropInComponent = nil
        }
    }

    @objc
    func open(_ paymentMethods: NSDictionary, configuration: NSDictionary) {
        guard let data = try? JSONSerialization.data(withJSONObject: paymentMethods, options: []),
              let paymentMethods = try? JSONDecoder().decode(PaymentMethods.self, from: data)
        else { return }

        guard
            let environment = configuration[Keys.environment] as? String,
            let clientKey = configuration[Keys.clientKey] as? String
        else { return }

        let apiContext = APIContext(environment: Environment.parse(environment), clientKey: clientKey)
        
        let allowsSkippingPaymentList = configuration[Keys.skipListWhenSinglePaymentMethod] as? Bool
        
        let config = DropInComponent.Configuration(apiContext: apiContext,allowsSkippingPaymentList: allowsSkippingPaymentList ?? false)
        
        
        if let showsHolderNameField = configuration[Keys.holderNameRequired] as? Bool {
            config.card.showsHolderNameField = showsHolderNameField
        }
       
        if let showsStorePaymentMethodField = configuration[Keys.showStorePaymentField] as? Bool {
            config.card.showsStorePaymentMethodField = showsStorePaymentMethodField
        }
        
        if let showsSecurityCodeField = configuration[Keys.hideCvcStoredCard] as? Bool {
            config.card.stored.showsSecurityCodeField  = showsSecurityCodeField
        }

        
        if let paymentObject = configuration[Keys.amount] as? [String: Any],
           let paymentAmount = paymentObject[Keys.value] as? Int,
           let countryCode = configuration[Keys.countryCode] as? String,
           let currencyCode = paymentObject[Keys.currency] as? String {
            config.payment = Payment(amount: Amount(value: paymentAmount, currencyCode: currencyCode),
                                     countryCode: countryCode)
        }

        // Apple Pay
        if let merchantId = configuration[Keys.applepayMerchantID] as? String, let payment = config.payment {
            let amount = AmountFormatter.decimalAmount(payment.amount.value, currencyCode: payment.amount.currencyCode)
            config.applePay = .init(summaryItems: [PKPaymentSummaryItem(label: "Total", amount: amount)],
                                    merchantIdentifier: merchantId)
        }

        let dropInComponentStyle = DropInComponent.Style()
        let component = DropInComponent(paymentMethods: paymentMethods,
                                        configuration: config,
                                        style: dropInComponentStyle)
        component.delegate = self
        dropInComponent = component

        DispatchQueue.main.async {
            UIApplication.shared.keyWindow?.rootViewController?.present(
                component.viewController,
                animated: true,
                completion: nil
            )
        }
    }

    @objc
    func handle(_ action: NSDictionary) {
        guard let data = try? JSONSerialization.data(withJSONObject: action, options: []),
              let action = try? JSONDecoder().decode(Action.self, from: data)
        else { return }

        DispatchQueue.main.async { [weak self] in
            self?.dropInComponent?.handle(action)
        }
    }

}

extension AdyenDropIn: DropInComponentDelegate {

    func didSubmit(_ data: PaymentComponentData,
                   for paymentMethod: PaymentMethod,
                   from component: DropInComponent) {
        sendEvent(event: .didSubmit, body: data.jsonObject)
    }

    func didProvide(_ data: ActionComponentData, from component: DropInComponent) {
        sendEvent(event: .didProvide, body: data.jsonObject)
    }

    func didComplete(from component: DropInComponent) {
        sendEvent(event: .didComplete, body: nil)
    }

    func didFail(with error: Error, from component: DropInComponent) {
        sendEvent(event: .didFail, body: error.toDictionary)
    }

}
