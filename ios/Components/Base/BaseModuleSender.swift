//
// Copyright (c) 2025 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

internal class BaseModuleSender: BaseModule {

    internal func createActionHandler(context: AdyenContext, locale: String?) {
        let style = AdyenAppearanceLoader.findStyle()?.actionComponent ?? .init()
        var config = AdyenActionComponent.Configuration(style: style)
        if let locale {
            config.localizationParameters = LocalizationParameters(enforcedLocale: locale)
        }
        actionHandler = AdyenActionComponent(context: context, configuration: config)
        actionHandler?.delegate = self
        actionHandler?.presentationDelegate = self
    }

    internal func sendEvent(event: Events, body: Any!) {
        sendEvent(withName: event.rawValue, body: body)
    }

    internal func sendEvent(event: Events) {
        sendEvent(withName: event.rawValue, body: [:])
    }

    internal func sendSubmitEvent(data: PaymentComponentData) {
        let extra = (data.paymentMethod as? ApplePayDetails)?.extraData
        let response = SubmitData(paymentData: data.jsonObject, extra: extra)
        sendEvent(event: .didSubmit, body: response.jsonObject)
    }

    internal func sendProvideEvent(actionData: [String: Any]) {
        sendEvent(event: .didProvide, body: actionData)
    }

    internal func sendSessionCompleteEvent(result: Adyen.AdyenSessionResult) {
        var result = result.jsonObject
        result[Keys.sessionId] = Self.session?.sessionContext.identifier
        result[Keys.sessionData] = Self.session?.sessionContext.data
        result[Keys.order] = self.currentPaymentComponent?.order?.jsonObject
        sendEvent(event: .didComplete, body: result)
    }

    internal func sendBinValueEvent(binValue: String) {
        sendEvent(event: .didChangeBinValue, body: binValue)
    }

    internal func sendBinLookupEvent(brands: [String]) {
        sendEvent(event: .didBinLookup, body: brands)
    }

    internal func sendComplete() {
        let result = ResultDTO(result: .presentToShopper)
        sendEvent(event: .didComplete, body: result.jsonObject)
    }

    internal func sendAddressUpdate(searchTerm: String) {
        sendEvent(event: .didUpdateAddress, body: searchTerm)
    }

    internal func sendAddressConfirm(json: [String: Any]) {
        sendEvent(event: .didConfirmAddress, body: json)
    }
}

extension BaseModuleSender: SessionResultListener {
    func didComplete(with result: Adyen.AdyenSessionResult) {
        sendSessionCompleteEvent(result: result)
    }

    func didFail(with error: Error) {
        sendEvent(error: error)
    }
}

extension BaseModuleSender: PaymentComponentDelegate {
    func didSubmit(_ data: Adyen.PaymentComponentData, from component: any Adyen.PaymentComponent) {
        sendSubmitEvent(data: data)
    }

    func didFail(with error: any Error, from component: any Adyen.PaymentComponent) {
        sendEvent(error: error)
    }
}

extension BaseModuleSender: ActionComponentDelegate {

    internal func didFail(with error: Error, from component: ActionComponent) {
        sendEvent(error: error)
    }

    internal func didComplete(from component: ActionComponent) {
        sendComplete()
    }

    internal func didProvide(_ data: ActionComponentData, from component: ActionComponent) {
        sendEvent(event: .didProvide, body: data.jsonObject)
    }
}

extension BaseModuleSender: CardComponentDelegate {
    func didSubmit(lastFour: String, finalBIN: String, component: Adyen.CardComponent) {
        /* No Callback implemented */
    }

    func didChangeBIN(_ value: String, component: Adyen.CardComponent) {
        sendBinValueEvent(binValue: value)
    }

    func didChangeCardBrand(_ value: [Adyen.CardBrand]?, component: Adyen.CardComponent) {
        guard let value, !value.isEmpty else { return }
        sendBinLookupEvent(brands: value.map(\.type.rawValue))
    }
}

extension BaseModuleSender: AddressLookupProvider {
    func lookUp(searchTerm: String, resultHandler: @escaping ([LookupAddressModel]) -> Void) {
        lookupHandler = resultHandler
        sendAddressUpdate(searchTerm: searchTerm)
    }

    func complete(
        incompleteAddress: LookupAddressModel,
        resultHandler: @escaping (Result<PostalAddress, any Error>) -> Void
    ) {
        lookupCompliationHandler = resultHandler
        sendAddressConfirm(json: incompleteAddress.jsonObject)
    }
}
