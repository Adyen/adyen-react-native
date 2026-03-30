//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

/// Per-component delegate that tags every emitted event with `componentType`,
/// allowing the JS side to demux events from multiple simultaneous embedded views.
internal final class EmbeddedComponentDelegateProxy: NSObject {
    let componentType: String
    weak var bus: EmbeddedComponentBusModule?

    init(componentType: String, bus: EmbeddedComponentBusModule) {
        self.componentType = componentType
        self.bus = bus
        super.init()
    }

    private func taggedBody(_ body: [String: Any]) -> [String: Any] {
        var dict = body
        dict["componentType"] = componentType
        return dict
    }

    internal func sendError(error: Error) {
        guard let bus else { return }
        let errorToSend = bus.checkErrorType(error)
        if let _ = BaseModule.session {
            BaseModule.sessionDelegate?.sendError(error: error)
            return
        }
        bus.sendEvent(event: .fail, body: taggedBody(errorToSend.jsonObject))
    }
}

// MARK: - PaymentComponentDelegate

extension EmbeddedComponentDelegateProxy: PaymentComponentDelegate {
    func didSubmit(_ data: PaymentComponentData, from _: any PaymentComponent) {
        guard let bus else { return }
        let extra = (data.paymentMethod as? ApplePayDetails)?.extraData
        let response = SubmitData(paymentData: data.jsonObject, extra: extra)
        bus.sendEvent(event: .submit, body: taggedBody(response.jsonObject))
    }

    func didFail(with error: Error, from _: any PaymentComponent) {
        sendError(error: error)
    }
}

// MARK: - ActionComponentDelegate

extension EmbeddedComponentDelegateProxy: ActionComponentDelegate {
    func didProvide(_ data: ActionComponentData, from _: ActionComponent) {
        guard let bus else { return }
        bus.sendEvent(event: .additionalDetails, body: taggedBody(data.jsonObject))
    }

    func didComplete(from _: ActionComponent) {
        guard let bus else { return }
        let result = ResultDTO(result: .presentToShopper)
        bus.sendEvent(event: .complete, body: taggedBody(result.jsonObject))
    }

    func didFail(with error: Error, from _: ActionComponent) {
        sendError(error: error)
    }

    // No-op: external application opens are handled by the OS
    func didOpenExternalApplication(component _: ActionComponent) {}
}

// MARK: - CardComponentDelegate

extension EmbeddedComponentDelegateProxy: CardComponentDelegate {
    // No-op: lastFour/finalBIN are not forwarded to JS
    func didSubmit(lastFour _: String, finalBIN _: String, component _: CardComponent) {}

    func didChangeBIN(_ value: String, component _: CardComponent) {
        guard let bus else { return }
        bus.sendEvent(event: .changeBinValue, body: taggedBody(["value": value]))
    }

    func didChangeCardBrand(_ value: [CardBrand]?, component _: CardComponent) {
        guard let bus else { return }
        guard let value, !value.isEmpty else { return }
        let jsonData = value.map { BinLookupDataDTO(brand: $0.type.rawValue).jsonObject }
        bus.sendEvent(event: .binLookup, body: taggedBody(["data": jsonData]))
    }
}

// MARK: - AddressLookupProvider

extension EmbeddedComponentDelegateProxy: AddressLookupProvider {
    func lookUp(searchTerm: String, resultHandler: @escaping ([LookupAddressModel]) -> Void) {
        guard let bus else { return }
        bus.storeLookupHandler(for: componentType, handler: resultHandler)
        bus.sendEvent(event: .updateAddress, body: taggedBody(["value": searchTerm]))
    }

    func complete(
        incompleteAddress: LookupAddressModel,
        resultHandler: @escaping (Result<PostalAddress, any Error>) -> Void
    ) {
        guard let bus else { return }
        bus.storeLookupCompletionHandler(for: componentType, handler: resultHandler)
        bus.sendEvent(event: .confirmAddress, body: taggedBody(incompleteAddress.jsonObject))
    }
}
