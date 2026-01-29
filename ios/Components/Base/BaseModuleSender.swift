//
// Copyright (c) 2026 Adyen N.V.
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

    internal func sendEvent(event: Events) {
        sendEvent(withName: event.rawValue, body: [:])
    }

    internal func sendSubmitEvent(data: PaymentComponentData) {
        let extra = (data.paymentMethod as? ApplePayDetails)?.extraData
        let response = SubmitData(paymentData: data.jsonObject, extra: extra)
        sendEvent(event: .submit, body: response.jsonObject)
    }

    internal func sendCompleteEvent() {
        let result = ResultDTO(result: .presentToShopper)
        sendEvent(event: .complete, body: result.jsonObject)
    }

    internal func sendProvideEvent(actionData: ActionComponentData) {
        sendEvent(event: .provide, body: actionData.jsonObject)
    }
}
