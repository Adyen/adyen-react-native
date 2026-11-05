//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

extension BaseModuleSender: PaymentComponentDelegate {
    package func didSubmit(_ data: Adyen.PaymentComponentData, from _: any Adyen.PaymentComponent) {
        sendSubmitEvent(data: data)
    }

    package func didFail(with error: any Error, from _: any Adyen.PaymentComponent) {
        sendError(error: error)
    }
}

extension BaseModuleSender: ActionComponentDelegate {

    package func didFail(with error: Error, from _: ActionComponent) {
        sendError(error: error)
    }

    package func didComplete(from _: ActionComponent) {
        sendCompleteEvent()
    }

    package func didProvide(_ data: ActionComponentData, from _: ActionComponent) {
        sendProvideEvent(actionData: data)
    }
}

extension BaseModuleSender: CardComponentDelegate {
    package func didSubmit(lastFour _: String, finalBIN _: String, component _: CardComponent) {
        /* No Callback implemented */
    }

    package func didChangeBIN(_ value: String, component _: CardComponent) {
        sendEvent(event: .changeBinValue, body: value)
    }

    package func didChangeCardBrand(_ value: [CardBrand]?, component _: CardComponent) {
        guard let value, !value.isEmpty else { return }
        let jsonData = value.map { BinLookupDataDTO(brand: $0.type.rawValue).jsonObject }
        sendEvent(event: .binLookup, body: jsonData)
    }
}
