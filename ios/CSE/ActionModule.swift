//
// Copyright (c) 2023 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Foundation
import React
import Adyen3DS2

@objc(AdyenAction)
internal final class ActionModule: BaseModule, ActionComponentDelegate {

    @objc override public func supportedEvents() -> [String]! { [] }

    @objc override func constantsToExport() -> [AnyHashable: Any]! {
        [Constant.threeDS2SdkVersionName: threeDS2SdkVersion]
    }

    private var resolver: RCTPromiseResolveBlock?
    private var rejecter: RCTPromiseRejectBlock?

    func didProvide(_ data: Adyen.ActionComponentData, from component: Adyen.ActionComponent) {
        resolver?(data.jsonObject)
    }

    func didComplete(from component: Adyen.ActionComponent) {
        resolver?(nil)
    }

    func didFail(with error: Error, from component: Adyen.ActionComponent) {
        let errorToSend = checkErrorType(error)
        if let error = error as? NativeModuleError {
            return reject(with: error)
        }
        rejecter?(Constant.componentError, error.localizedDescription, error)
    }

    @objc
    func handle(_ actionJson: NSDictionary,
                configuration: NSDictionary,
                resolver: @escaping RCTPromiseResolveBlock,
                rejecter: @escaping RCTPromiseRejectBlock) {
        self.resolver = resolver
        self.rejecter = rejecter
        let action: Action
        let parser = RootConfigurationParser(configuration: configuration)
        let context: AdyenContext
        do {
            action = try parseAction(from: actionJson)
            context = try parser.fetchContext(session: BaseModule.session)
        } catch NativeModuleError.invalidAction {
            return reject(with: NativeModuleError.invalidAction)
        } catch NativeModuleError.noClientKey {
            return reject(with: NativeModuleError.noClientKey)
        } catch {
            return rejecter(Constant.parsingErrorCode, error.localizedDescription, error)
        }

        let style = AdyenAppearanceLoader.findStyle()?.actionComponent ?? .init()
        actionHandler = AdyenActionComponent(context: context, configuration: .init(style: style))
        actionHandler?.delegate = self
        actionHandler?.presentationDelegate = self
        currentComponent = actionHandler

        DispatchQueue.main.async { [weak self] in
            self?.actionHandler?.handle(action)
        }
    }

    @objc
    func hide(_ success: NSNumber) {
        resolver = nil
        rejecter = nil
        dismiss(success.boolValue)
    }

    private enum Constant {
        static var moduleName = "ActionModule"
        static var threeDS2SdkVersionName = "threeDS2SdkVersion"
        static var parsingErrorCode = "parsingError"
        static var componentError = "actionError"
    }

    func reject(with error: NativeModuleError) {
        rejecter?(error.errorCode, error.errorDescription, error)
    }
}
