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
    func sendSessionError(error: Error)
}

@objc(SessionHelper)
internal final class SessionHelperModule: BaseModule, SessionErrorDelegate {

    override func supportedEvents() -> [String]! { Events.sessionEvents.map(\.rawValue) }

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

        guard let id = sessionModelJSON["id"] as? String, let data = sessionModelJSON["sessionData"] as? String else {
            return rejecter("session", "Invalid session data", nil)
        }

        let config = AdyenSession.Configuration(sessionIdentifier: id, initialSessionData: data, context: context)
        DispatchQueue.main.async {
            AdyenSession.initialize(with: config, delegate: self, presentationDelegate: self) { result in
                switch result {
                case let .success(session):
                    let dto = SessionDTO(session: session)
                    resolver(dto.jsonObject)
                    BaseModule.session = session
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

    func sendSessionError(error: Error) {
        let errorToSend = checkErrorType(error)
        sendEvent(event: .failSession, body: errorToSend.jsonObject)
    }

}

extension SessionHelperModule: AdyenSessionDelegate {
        // MARK: - AdyenSessionDelegate

    func didComplete(with result: Adyen.AdyenSessionResult, component: Adyen.Component, session: Adyen.AdyenSession) {
        var dict = result.jsonObject
        dict[Key.sessionId] = session.sessionContext.identifier
        dict[Key.sessionData] = session.sessionContext.data
        sendEvent(event: .completeSession, body: dict)
    }

    func didFail(with error: Error, from component: Adyen.Component, session: Adyen.AdyenSession) {
        let errorToSend = checkErrorType(error)
        sendEvent(event: .failSession, body: errorToSend.jsonObject)
    }

    func didOpenExternalApplication(component: Adyen.ActionComponent, session: Adyen.AdyenSession) {}
}
