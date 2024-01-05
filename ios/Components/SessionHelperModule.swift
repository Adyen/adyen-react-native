    //
    // Copyright (c) 2022 Adyen N.V.
    //
    // This file is open source and available under the MIT license. See the LICENSE file for more info.
    //

import UIKit
import Adyen

protocol SessionResultListener {
    func didComplete(with result: Adyen.AdyenSessionResult)
    func didFail(with error: Error)
}

@objc(SessionHelper)
internal final class SessionHelperModule: BaseModule, AdyenSessionDelegate {

    internal static var sessionListener: SessionResultListener?

    func didComplete(with result: Adyen.AdyenSessionResult, component: Adyen.Component, session: Adyen.AdyenSession) {
        SessionHelperModule.sessionListener?.didComplete(with: result)
    }

    func didFail(with error: Error, from component: Adyen.Component, session: Adyen.AdyenSession) {
        SessionHelperModule.sessionListener?.didFail(with: error)
    }

    func didOpenExternalApplication(component: Adyen.ActionComponent, session: Adyen.AdyenSession) {
    }

    override public func supportedEvents() -> [String]! { [Events.didComplete.rawValue, Events.didFail.rawValue] }


    @objc
    func createSession(_ sessionModelJSON: NSDictionary,
                       configuration: NSDictionary,
                       resolver: @escaping RCTPromiseResolveBlock,
                       rejecter: @escaping RCTPromiseRejectBlock) {
        let parser = RootConfigurationParser(configuration: configuration)
        let context: AdyenContext
        do {
            context = try parser.fetchContext()
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

    @objc
    func hide(_ success: NSNumber, event: NSDictionary) {
        dismiss(success.boolValue)
    }



}
