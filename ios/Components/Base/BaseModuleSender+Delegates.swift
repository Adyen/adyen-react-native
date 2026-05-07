//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

extension BaseModuleSender: PaymentComponentDelegate {
    func didSubmit(_ data: Adyen.PaymentComponentData, from _: any Adyen.PaymentComponent) {
        sendSubmitEvent(data: data)
    }

    func didFail(with error: any Error, from _: any Adyen.PaymentComponent) {
        sendError(error: error)
    }
}

extension BaseModuleSender: ActionComponentDelegate {

    internal func didFail(with error: Error, from _: ActionComponent) {
        sendError(error: error)
    }

    internal func didComplete(from _: ActionComponent) {
        sendCompleteEvent()
    }

    internal func didProvide(_ data: ActionComponentData, from _: ActionComponent) {
        sendProvideEvent(actionData: data)
    }
}

extension BaseModuleSender: CardComponentDelegate {
    func didSubmit(lastFour _: String, finalBIN _: String, component _: Adyen.CardComponent) {
        /* No Callback implemented */
    }

    func didChangeBIN(_ value: String, component _: Adyen.CardComponent) {
        sendEvent(event: .changeBinValue, body: value)
    }

    func didChangeCardBrand(_ value: [Adyen.CardBrand]?, component _: Adyen.CardComponent) {
        guard let value, !value.isEmpty else { return }
        let jsonData = value.map { BinLookupDataDTO(brand: $0.type.rawValue).jsonObject }
        sendEvent(event: .binLookup, body: jsonData)
    }
}
