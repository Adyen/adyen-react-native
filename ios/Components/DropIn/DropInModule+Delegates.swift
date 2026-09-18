//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import AdyenDropIn

// TODO: Disabled — these delegate types are `package`-scoped in Adyen and don't resolve across a
// vendored xcframework boundary. Re-enable once DropIn is fully supported or they go `public`.
#if false
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
            // `Balance` is package-scoped and no longer `Decodable`, so it can't be rebuilt from JS; always fail.
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
            // `CancelOrderData` was removed with the v6 rework; emit the order payload directly.
            sendEvent(event: .cancelOrder, body: order.jsonObject)
        }

        @objc(providePaymentMethods:order:)
        func providePaymentMethods(_: NSDictionary, orderJson _: NSDictionary) {
            sendError(error: ModuleException.notSupported)
        }

    }
#endif
