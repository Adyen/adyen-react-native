//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

extension BaseModuleSender: PaymentComponentDelegate {
    func didSubmit(_ data: Adyen.PaymentComponentData, from component: any Adyen.PaymentComponent) {
        sendSubmitEvent(data: data)
    }

    func didFail(with error: any Error, from component: any Adyen.PaymentComponent) {
        sendError(error: error)
    }
}

extension BaseModuleSender: ActionComponentDelegate {

    internal func didFail(with error: Error, from component: ActionComponent) {
        sendError(error: error)
    }

    internal func didComplete(from component: ActionComponent) {
        sendCompleteEvent()
    }

    internal func didProvide(_ data: ActionComponentData, from component: ActionComponent) {
        sendProvideEvent(actionData: data)
    }
}

extension BaseModuleSender: CardComponentDelegate {
    func didSubmit(lastFour: String, finalBIN: String, component: Adyen.CardComponent) {
        /* No Callback implemented */
    }

    func didChangeBIN(_ value: String, component: Adyen.CardComponent) {
        sendEvent(event: .changeBinValue, body: value)
    }

    func didChangeCardBrand(_ value: [Adyen.CardBrand]?, component: Adyen.CardComponent) {
        guard let value, !value.isEmpty else { return }
        let jsonData = value.map { BinLookupDataDTO(brand: $0.type.rawValue).jsonObject }
        sendEvent(event: .binLookup, body: jsonData)
    }
}
