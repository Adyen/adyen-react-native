//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

extension DropInModule: DropInComponentDelegate {
    func didSubmit(_ data: Adyen.PaymentComponentData,
                   from _: Adyen.PaymentComponent,
                   in _: Adyen.AnyDropInComponent) {
        sendSubmitEvent(data: data)
    }

    func didFail(with error: Error,
                 from _: Adyen.PaymentComponent,
                 in _: Adyen.AnyDropInComponent) {
        sendError(error: error)
    }

    func didProvide(_ data: Adyen.ActionComponentData,
                    from _: Adyen.ActionComponent,
                    in _: Adyen.AnyDropInComponent) {
        sendProvideEvent(actionData: data)
    }

    func didComplete(from _: Adyen.ActionComponent,
                     in _: Adyen.AnyDropInComponent) {
        // Drop-in is not supported in v6 alpha (`open()` fails early), so this delegate should
        // never fire. Report an explicit not-supported error rather than falsely reporting an
        // authorised payment if the SDK ever invokes it.
        sendError(error: ModuleException.notSupported)
    }

    func didFail(with error: Error,
                 from _: Adyen.ActionComponent,
                 in _: Adyen.AnyDropInComponent) {
        sendError(error: error)
    }

    func didFail(with error: Error,
                 from _: Adyen.AnyDropInComponent) {
        sendError(error: error)
    }
}

extension DropInModule: StoredPaymentMethodsDelegate {
    func disable(storedPaymentMethod: any Adyen.StoredPaymentMethod,
                 completion: @escaping Adyen.Completion<Bool>) {
        disableStoredPaymentMethodHandler = completion
        sendEvent(event: .disableStoredPaymentMethod, body: storedPaymentMethod.jsonObject)
    }
}

extension DropInModule: PartialPaymentDelegate {

    func checkBalance(with data: PaymentComponentData,
                      component _: any Adyen.Component,
                      completion: @escaping (Result<Balance, any Error>) -> Void) {
        sendEvent(event: .checkBalance, body: data.jsonObject)
        checkBalanceHandler = completion
    }

    @objc
    func provideBalance(_: NSNumber, balance _: NSDictionary?, error: NSDictionary?) {
        // Partial payments are unsupported in v6 alpha: `Balance` is a package struct that no
        // longer conforms to `Decodable`, so a balance cannot be reconstructed from JS. Fail the
        // pending balance check rather than resolving it with a value we cannot build.
        ensureMainThread { [weak self] in
            guard let self, let checkBalanceHandler = self.checkBalanceHandler else { return }
            let message = error.getErrorMessage
            checkBalanceHandler(.failure(ModuleException.balanceCheck(message: message)))
        }
    }

    func requestOrder(for _: any Adyen.Component,
                      completion: @escaping (Result<PartialPaymentOrder, any Error>) -> Void) {
        sendEvent(event: .requestOrder)
        requestOrderHandler = completion
    }

    @objc
    func provideOrder(_ success: NSNumber, order: NSDictionary?, error: NSDictionary?) {
        ensureMainThread { [weak self] in
            guard let self, let requestOrderHandler = self.requestOrderHandler else { return }
            guard success.boolValue, let order: PartialPaymentOrder = try? order?.decode() else {
                let message = error.getErrorMessage
                return requestOrderHandler(.failure(ModuleException.orderRequest(message: message)))
            }
            requestOrderHandler(.success(order))
        }
    }

    func cancelOrder(_ order: Adyen.PartialPaymentOrder, component _: any Adyen.Component) {
        // The `CancelOrderData` wrapper model was removed with the v6 partial-payment rework; emit
        // the order payload directly so the event still fires without the retired type.
        sendEvent(event: .cancelOrder, body: order.jsonObject)
    }

    @objc(providePaymentMethods:order:)
    func providePaymentMethods(_ paymentMethodsJson: NSDictionary, orderJson: NSDictionary) {
        let paymentMethods: PaymentMethods
        let order: PartialPaymentOrder
        do {
            paymentMethods = try paymentMethodsJson.decode()
            order = try orderJson.decode()

            guard let dropIn = currentComponent as? DropInComponent else {
                throw ModuleException.notSupported
            }

            try dropIn.reload(with: order, paymentMethods)
        } catch {
            return sendError(error: error)
        }
    }

}
