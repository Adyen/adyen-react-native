//
// Copyright (c) 2024 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import AdyenNetworking
import React
import UIKit

protocol SessionErrorDelegate: AnyObject {
    func sendError(error: Error)
}

@objc(SessionHelper)
public final class SessionHelperModule: BaseModule, SessionErrorDelegate {

    override public func supportedEvents() -> [String]! {
        EventName.sessionEvents.map(\.rawValue)
    }

    @objc
    func setSdkVersion(_ sdkVersion: String) {
        BaseModule.sdkVersion = sdkVersion
    }

    @objc
    override func hide(_ success: NSNumber, event: NSDictionary) {
        super.hide(success, event: event)
        // Delegate hide to the current active module (DropIn, GooglePay, etc.)
        if let activeModule = BaseModule.currentModule {
            activeModule.hide(success, event: event)
        }
    }

    @objc
    func createSession(_ sessionModelJSON: NSDictionary,
                       configuration: NSDictionary,
                       resolver: @escaping RCTPromiseResolveBlock,
                       rejecter: @escaping RCTPromiseRejectBlock) {
        let parser = RootConfigurationParser(configuration: configuration)
        let context: AdyenContext
        do {
            context = try parser.fetchContext(session: BaseModule.session)
        } catch {
            return rejecter("session", nil, error)
        }

        guard let id = sessionModelJSON["id"] as? String,
              let data = sessionModelJSON["sessionData"] as? String else {
            return rejecter("session", "Invalid session data", nil)
        }

        let config = AdyenSession.Configuration(sessionIdentifier: id, initialSessionData: data, context: context)
        ensureMainThread {
            AdyenSession.initialize(with: config, delegate: self, presentationDelegate: self) { result in
                switch result {
                case let .success(session):
                    let dto = SessionDTO(session: session)
                    resolver(dto.jsonObject)
                    BaseModule.session = session
                    BaseModule.sessionDelegate = self
                case let .failure(error):
                    rejecter("session", nil, error)
                }
            }
        }
    }

    private enum Key {
        static let sessionId = "sessionId"
        static let sessionData = "sessionData"
    }

    override func sendError(error: any Error) {
        let errorToSend = checkErrorType(error)
        sendEvent(withName: EventName.failSession.rawValue, body: errorToSend.jsonObject)
    }
}

extension SessionHelperModule: AdyenSessionDelegate {

    public func didComplete(with result: AdyenSessionResult, component _: Adyen.Component, session: AdyenSession) {
        var dict = result.jsonObject
        dict[Key.sessionId] = session.sessionContext.identifier
        dict[Key.sessionData] = session.sessionContext.data
        sendEvent(withName: EventName.completeSession.rawValue, body: dict)
    }

    public func didFail(with error: Error, from _: Adyen.Component, session _: AdyenSession) {
        sendError(error: error)
    }

    public func didOpenExternalApplication(component _: Adyen.ActionComponent, session _: AdyenSession) {
        // No-op: external application redirects are handled by the OS
    }
}
