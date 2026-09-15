//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import AdyenDropIn

// TODO: DropIn is not fully supported in v6 alpha (`DropInModule.start()`/`action()` already
// fail early with `ModuleException.notSupported`), and these delegate conformances can't
// compile against the vendored xcframeworks anyway: DropInComponentDelegate,
// StoredPaymentMethodsDelegate, PartialPaymentDelegate, and the types their methods use
// (PaymentComponent, AnyDropInComponent, ActionComponent, Balance, Completion) are all
// `package`-scoped in the real Adyen module. Swift's module loader for vendored xcframeworks
// never resolves a dependency's .package.swiftinterface (only .private/.public), so
// package-level access across a precompiled-xcframework boundary does not work. Disabled
// entirely until either DropIn is fully supported again or these become `public` upstream.
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
        func providePaymentMethods(_: NSDictionary, orderJson _: NSDictionary) {
            sendError(error: ModuleException.notSupported)
        }

    }
#endif
