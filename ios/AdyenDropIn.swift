//
// Copyright (c) 2021 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//


import Foundation
import Adyen
import React
import PassKit

@objc(AdyenDropIn)
internal class AdyenDropIn: RCTEventEmitter {

    private var dropInComponent: DropInComponent?

    @objc
    override static func requiresMainQueueSetup() -> Bool { true }
    override func stopObserving() { }
    override func startObserving() { }

    override func supportedEvents() -> [String]! {
        ["didSubmitCallback", "didProvideCallback", "didCompleteCallback", "didFailCallback"]
    }

    @objc
    func hide() {
        dropInComponent?.cancelIfNeeded()
        DispatchQueue.main.async {
            UIApplication.shared.keyWindow?.rootViewController?.dismiss(animated: true, completion: nil)
        }
    }

    @objc
    func open(_ paymentMethods : NSDictionary, configuration: NSDictionary) {
        guard let data = try? JSONSerialization.data(withJSONObject: paymentMethods, options: []),
              let paymentMethods = try? JSONDecoder().decode(PaymentMethods.self, from: data)
        else { return }

        guard
            let environment = configuration["environment"] as? String,
            let clientKey = configuration["clientKey"] as? String
        else { return }

        let apiContext = APIContext(environment: Environment.parse(environment), clientKey: clientKey)
        let config = DropInComponent.Configuration(apiContext: apiContext)

        if let paymentObject = configuration["amount"] as? [String: Any],
           let paymentAmount = paymentObject["value"] as? Int,
           let countryCode = configuration["countryCode"] as? String,
           let currencyCode = paymentObject["currency"] as? String {
            config.payment = Payment(amount: Amount(value: paymentAmount,
                                                    currencyCode: currencyCode),
                                     countryCode: countryCode)
        }

        // Apple Pay
        if let merchantId = configuration["applepayMerchantID"] as? String, let payment = config.payment {
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
                completion: nil)
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
        sendEvent(withName: "didSubmitCallback", body: data.jsonObject)
    }

    func didProvide(_ data: ActionComponentData, from component: DropInComponent) {
        sendEvent(withName: "didProvideCallback", body: data.jsonObject)
    }

    func didComplete(from component: DropInComponent) {
        sendEvent(withName: "didCompleteCallback", body: nil)
    }

    func didFail(with error: Error, from component: DropInComponent) {
        sendEvent(withName: "didFailCallback", body: error.toDictionary)
    }

}
