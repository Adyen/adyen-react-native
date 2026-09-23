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
        let parser = RootConfigurationParser(configuration: configuration)

        Task { @MainActor [weak self] in
            guard let self, self.isActive(operation) else { return }
            do {
                let checkoutConfiguration = try parser.checkoutConfiguration {
                    CardConfigurationParser(configuration: configuration).configuration
                    ThreeDS2ConfigurationParser(configuration: configuration).configuration
                }
                let checkout = try await Checkout.setup(
                    configuration: checkoutConfiguration,
                    presentationDelegate: self
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

extension ActionTurboModuleAdapter: PresentationDelegate {
    func present(component: PresentableComponent) {
        guard let operation = activeAction, isActive(operation) else {
            return
        }
        guard let presenter = UIViewController.topPresenter else {
            cancel(operation)
            return
        }
        let controller = UINavigationController(rootViewController: component.viewController)
        operation.presentedController = controller
        presenter.present(controller, animated: true)
    }
}

@MainActor
private final class ActiveAction {
    let id: Int
    let resolver: RCTPromiseResolveBlock
    let rejecter: RCTPromiseRejectBlock
    var checkout: ActionOnlyCheckout?
    weak var presentedController: UIViewController?

    init(id: Int, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        self.id = id
        self.resolver = resolver
        self.rejecter = rejecter
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
