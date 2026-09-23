//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Adyen3DS2
import AdyenCard
import AdyenCheckout
import Foundation
import React
import UIKit

/// Swift implementation backing the generated standalone Action TurboModule.
@objc(ActionTurboModuleAdapter)
@MainActor
internal final class ActionTurboModuleAdapter: NSObject {

    private var activeAction: ActiveAction?
    private var nextOperationID = 0
    private let operationGate = ActionOperationGate()
    private let presentationRouter: ActionPresentationRouter

    override init() {
        presentationRouter = ActionPresentationRouter(host: DefaultActionPresentationHost())
        super.init()
    }

    internal init(presentationHost: ActionPresentationHost) {
        presentationRouter = ActionPresentationRouter(host: presentationHost)
        super.init()
    }

    @objc
    func handle(_ actionJSON: NSDictionary,
                configuration: NSDictionary,
                resolver: @escaping RCTPromiseResolveBlock,
                rejecter: @escaping RCTPromiseRejectBlock) {
        guard activeAction == nil else {
            rejecter(ErrorCode.busy, "A standalone action is already active", nil)
            return
        }

        let action: Action
        do {
            let data = try JSONSerialization.data(withJSONObject: actionJSON)
            action = try JSONDecoder().decode(Action.self, from: data)
        } catch {
            reject(with: error, resolver: resolver, rejecter: rejecter)
            return
        }

        nextOperationID += 1
        guard operationGate.activate(nextOperationID) else {
            rejecter(ErrorCode.busy, "A standalone action is already active", nil)
            return
        }
        let operation = ActiveAction(id: nextOperationID, resolver: resolver, rejecter: rejecter)
        activeAction = operation
        presentationRouter.activate(operation)
        let parser = RootConfigurationParser(configuration: configuration)

        Task { @MainActor [weak self] in
            guard let self, self.isActive(operation) else { return }
            do {
                let checkoutConfiguration = try parser.checkoutConfiguration {
                    CardConfigurationParser(configuration: configuration).configuration
                    ThreeDS2ConfigurationParser(configuration: configuration).configuration
                }
                let presentationDelegate = self.presentationRouter.delegate(for: operation) { [weak self] operation in
                    self?.cancel(operation)
                }
                operation.presentationDelegate = presentationDelegate
                let checkout = try await Checkout.setup(
                    configuration: checkoutConfiguration,
                    presentationDelegate: presentationDelegate
                )
                guard self.isActive(operation) else { return }
                operation.checkout = checkout
                self.setupCallbacks(on: checkout, operation: operation)
                checkout.handle(action: action)
            } catch {
                self.reject(operation, error: error)
            }
        }
    }

    @objc
    func hideWithResolver(_ resolver: @escaping RCTPromiseResolveBlock,
                          rejecter _: @escaping RCTPromiseRejectBlock) {
        if let operation = activeAction {
            cancel(operation) {
                resolver(nil)
            }
        } else {
            resolver(nil)
        }
    }

    @objc
    func getThreeDS2SdkVersionWithResolver(_ resolver: @escaping RCTPromiseResolveBlock,
                                           rejecter _: @escaping RCTPromiseRejectBlock) {
        resolver(ADY3DS2SDKVersion())
    }

    @objc
    func hostDidDisappear() {
        if let operation = activeAction {
            cancel(operation)
        }
    }

    private func setupCallbacks(on checkout: ActionOnlyCheckout, operation: ActiveAction) {
        _ = checkout
            .onAdditionalDetails { [weak self] data in
                self?.resolve(operation, value: data.jsonObject)
                return errorAdditionalDetailsResult
            }
            .onComplete { [weak self] result in
                self?.resolve(operation, value: ResultDTO(result: result.resultCode).jsonObject)
            }
            .onFailure { [weak self] error in
                self?.reject(operation, error: error)
            }
    }

    private func resolve(_ operation: ActiveAction, value: Any) {
        finish(operation) {
            do {
                try operation.resolver(actionJSON(value))
            } catch {
                operation.rejecter(ErrorCode.component, error.localizedDescription, error)
            }
        }
    }

    private func reject(_ operation: ActiveAction, error: Error) {
        let moduleError = ModuleException.checkErrorType(error)
        finish(operation) {
            if let exception = moduleError as? ModuleException {
                operation.rejecter(exception.errorCode, exception.errorDescription, exception)
            } else {
                operation.rejecter(ErrorCode.component, moduleError.localizedDescription, moduleError)
            }
        }
    }

    private func reject(with error: Error,
                        resolver _: @escaping RCTPromiseResolveBlock,
                        rejecter: @escaping RCTPromiseRejectBlock) {
        let moduleError = ModuleException.checkErrorType(error)
        if let exception = moduleError as? ModuleException {
            rejecter(exception.errorCode, exception.errorDescription, exception)
        } else {
            rejecter(ErrorCode.component, moduleError.localizedDescription, moduleError)
        }
    }

    private func cancel(_ operation: ActiveAction, afterCleanup: @escaping () -> Void = {}) {
        finish(operation) {
            operation.rejecter(ErrorCode.cancelled, "Standalone action cancelled", nil)
            afterCleanup()
        }
    }

    private func finish(_ operation: ActiveAction, settlement: @escaping () -> Void) {
        guard operationGate.beginCleanup(operation.id) else { return }
        presentationRouter.deactivate(operation)
        operation.presentationDelegate = nil
        operation.checkout = nil
        let complete = { [weak self, weak operation] in
            guard let self, let operation, self.operationGate.completeCleanup(operation.id) else { return }
            self.activeAction = nil
            settlement()
        }
        guard let controller = operation.presentedController,
              controller.presentingViewController != nil || controller.presentedViewController != nil else {
            operation.presentedController = nil
            complete()
            return
        }
        operation.presentedController = nil
        controller.dismiss(animated: true, completion: complete)
    }

    private func isActive(_ operation: ActiveAction) -> Bool {
        activeAction === operation && operationGate.isActive(operation.id)
    }
}

@MainActor
internal final class ActiveAction {
    let id: Int
    let resolver: RCTPromiseResolveBlock
    let rejecter: RCTPromiseRejectBlock
    var checkout: ActionOnlyCheckout?
    var presentationDelegate: PresentationDelegate?
    weak var presentedController: UIViewController?

    init(id: Int, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        self.id = id
        self.resolver = resolver
        self.rejecter = rejecter
    }
}

@MainActor
internal protocol ActionPresentationHost: AnyObject {
    func topPresenter() -> UIViewController?
    func present(_ controller: UIViewController, from presenter: UIViewController)
}

@MainActor
private final class DefaultActionPresentationHost: ActionPresentationHost {
    func topPresenter() -> UIViewController? {
        UIViewController.topPresenter
    }

    func present(_ controller: UIViewController, from presenter: UIViewController) {
        presenter.present(controller, animated: true)
    }
}

@MainActor
internal final class ActionPresentationRouter {

    private let host: ActionPresentationHost
    private weak var activeOperation: ActiveAction?

    init(host: ActionPresentationHost) {
        self.host = host
    }

    func activate(_ operation: ActiveAction) {
        activeOperation = operation
    }

    func deactivate(_ operation: ActiveAction) {
        guard activeOperation === operation else { return }
        activeOperation = nil
    }

    func delegate(for operation: ActiveAction,
                  onHostLoss: @escaping @MainActor (ActiveAction) -> Void) -> ActionPresentationDelegate {
        ActionPresentationDelegate(router: self, operation: operation, onHostLoss: onHostLoss)
    }

    fileprivate func present(_ viewController: UIViewController,
                             for operation: ActiveAction,
                             onHostLoss: @escaping @MainActor (ActiveAction) -> Void) {
        guard activeOperation === operation else { return }
        guard let presenter = host.topPresenter() else {
            onHostLoss(operation)
            return
        }
        let controller = UINavigationController(rootViewController: viewController)
        operation.presentedController = controller
        host.present(controller, from: presenter)
    }
}

@MainActor
internal final class ActionPresentationDelegate: PresentationDelegate {

    private weak var router: ActionPresentationRouter?
    private weak var operation: ActiveAction?
    private let onHostLoss: @MainActor (ActiveAction) -> Void

    init(router: ActionPresentationRouter,
         operation: ActiveAction,
         onHostLoss: @escaping @MainActor (ActiveAction) -> Void) {
        self.router = router
        self.operation = operation
        self.onHostLoss = onHostLoss
    }

    func present(component: PresentableComponent) {
        present(viewController: component.viewController)
    }

    func present(viewController: UIViewController) {
        guard let router, let operation else { return }
        router.present(viewController, for: operation, onHostLoss: onHostLoss)
    }
}

private enum ErrorCode {
    static let busy = "actionBusy"
    static let cancelled = "cancelled"
    static let component = "actionError"
}

private func actionJSON(_ object: Any) throws -> String {
    let data = try JSONSerialization.data(withJSONObject: object)
    return String(decoding: data, as: UTF8.self)
}
