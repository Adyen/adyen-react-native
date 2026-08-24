//
// Copyright (c) 2023 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Adyen3DS2
import Foundation
import React

@objc(AdyenAction)
internal final class ActionModule: BaseModule {

    /// The v6 action-only checkout that handles the standalone action. Retained so the SDK can
    /// present and complete the action after ``handle(_:configuration:resolver:rejecter:)`` returns.
    private var actionCheckout: ActionOnlyCheckout?

    @objc override func constantsToExport() -> [AnyHashable: Any]! {
        [Constant.threeDS2SdkVersionName: threeDS2SdkVersion]
    }

    private var resolver: RCTPromiseResolveBlock?
    private var rejecter: RCTPromiseRejectBlock?

    @objc
    func handle(_ actionJson: NSDictionary,
                configuration: NSDictionary,
                resolver: @escaping RCTPromiseResolveBlock,
                rejecter: @escaping RCTPromiseRejectBlock) {
        self.resolver = resolver
        self.rejecter = rejecter

        let action: Action
        let parser = RootConfigurationParser(configuration: configuration)
        do {
            action = try parseAction(from: actionJson)
        } catch {
            return reject(with: error)
        }

        Task { @MainActor [weak self] in
            guard let self else { return }
            do {
                let authenticationConfiguration = ThreeDS2ConfigurationParser(configuration: configuration).configuration
                let checkoutConfiguration = try parser.checkoutConfiguration {
                    authenticationConfiguration
                }
                let checkout = try await Checkout.setup(
                    configuration: checkoutConfiguration,
                    presentationDelegate: self
                )
                self.setupCallbacks(on: checkout)
                self.actionCheckout = checkout
                checkout.handle(action: action)
            } catch {
                self.reject(with: error)
            }
        }
    }

    @objc
    func hide(_ success: NSNumber) {
        resolver = nil
        rejecter = nil
        dismiss(success.boolValue)
    }

    /// Wires the v6 action-only closures to the JS promise. Replaces the v5
    /// `ActionComponentDelegate` conformance: additional details resolve the promise with the data
    /// for the merchant's `/payments/details` call, completion resolves with the result code, and
    /// failures reject the promise.
    @MainActor
    private func setupCallbacks(on checkout: ActionOnlyCheckout) {
        _ = checkout
            .onAdditionalDetails { [weak self] data in
                self?.resolve(with: data.jsonObject)
                return .completion(resultCode: "")
            }
            .onComplete { [weak self] result in
                self?.resolve(with: ResultDTO(result: result.resultCode).jsonObject)
            }
            .onFailure { [weak self] error in
                self?.reject(with: error)
            }
    }

    private enum Constant {
        static var threeDS2SdkVersionName = "threeDS2SdkVersion"
        static var componentError = "actionError"
    }

    private func resolve(with value: Any) {
        resolver?(value)
        resolver = nil
        rejecter = nil
    }

    func reject(with error: ModuleException) {
        rejecter?(error.errorCode, error.errorDescription, error)
        resolver = nil
        rejecter = nil
    }

    func reject(with error: any Error) {
        if let nativeError = ModuleException.checkErrorType(error) as? ModuleException {
            return reject(with: nativeError)
        }
        rejecter?(Constant.componentError, error.localizedDescription, error)
        resolver = nil
        rejecter = nil
    }

    override func sendError(error: any Error) {
        ensureMainThread { [weak self] in
            self?.reject(with: error)
        }
    }

    override func cleanUp() {
        ensureMainThread { [weak self] in
            self?.actionCheckout = nil
        }
        super.cleanUp()
    }
}
