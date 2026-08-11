//
// Copyright (c) 2021 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Foundation
import React

@objc(AdyenDropIn)
internal final class DropInModule: BaseAddressModule {

    // TODO: v6 migration - currentComponent was removed from BaseModule in v6.
    //  Drop-in still needs it to hold a reference to the presented DropInComponent.
    internal var currentComponent: Component?

    internal var disableStoredPaymentMethodHandler: Adyen.Completion<Bool>?
    internal var requestOrderHandler: ((Result<PartialPaymentOrder, any Error>) -> Void)?
    internal var checkBalanceHandler: ((Result<Balance, any Error>) -> Void)?

    override func supportedEvents() -> [String]! {
        super.supportedEvents() + (EventName.cardEvents + EventName.dropInEvents).map(\.rawValue)
    }

    private var dropInComponent: DropInComponent? {
        currentComponent as? DropInComponent
    }

    @objc
    func removeStored(_ success: NSNumber) {
        ensureMainThread { [weak self] in
            self?.disableStoredPaymentMethodHandler?(success.boolValue)
        }
    }

    @objc
    func open(_ paymentMethodsDict: NSDictionary, configuration: NSDictionary) {
        let parser = RootConfigurationParser(configuration: configuration)
        let paymentMethods: PaymentMethods
        do {
            paymentMethods = try parsePaymentMethods(from: paymentMethodsDict)
        } catch {
            return sendError(error: error)
        }

        // TODO: v6 migration - AdyenContext creation changed fundamentally.
        //  v5 used `parser.fetchContext(session:)` which no longer exists.
        //  v6 AdyenContext requires an async publicKey fetch from the server.
        //  Drop-in cannot be presented until this is properly migrated.
        //  For now, report an error and return early.
        sendError(error: ModuleException.notSupported)
        return

        // --- The v5 code below is preserved for reference during migration ---
        // let context: AdyenContext = try parser.fetchContext(session: BaseModule.session)
        //
        // let dropInConfigParser = DropInConfigurationParser(configuration: configuration)
        // let config = dropInConfigParser.configuration
        // config.card = CardConfigurationParser(configuration: configuration, delegate: self).dropinConfiguration
        // config.style = AdyenAppearanceLoader.findStyle() ?? DropInComponent.Style()
        // if let locale = parser.shopperLocale {
        //     config.localizationParameters = LocalizationParameters(enforcedLocale: locale)
        // }
        // if let requestorAppUrl = ThreeDS2ConfigurationParser(configuration: configuration).requestorAppUrl,
        //    let url = URL(string: requestorAppUrl) {
        //     config.actionComponent.threeDS.requestorAppURL = url
        // }
        // if let amount = context.amount {
        //     // TODO: v6 migration - ApplePay configuration needs Payment, not Amount
        // }
        // let partialPaymentParser = PartialPaymentParser(configuration: configuration)
        // config.giftCard.showsSecurityCodeField = partialPaymentParser.pinRequired
        //
        // let component = DropInComponent(paymentMethods: paymentMethods,
        //                                 context: context,
        //                                 configuration: config,
        //                                 title: dropInConfigParser.title)
        // currentComponent = component
        // component.delegate = self
        // component.partialPaymentDelegate = self
        // component.storedPaymentMethodsDelegate = self
        // present(component: component)
    }

    @objc
    override func action(_ dictionary: NSDictionary) {
        let action: Action
        do {
            action = try parseAction(from: dictionary)
        } catch {
            return sendError(error: error)
        }

        ensureMainThread { [weak self] in
            self?.dropInComponent?.handle(action)
        }
    }

    @objc
    func getReturnURL(_ resolver: @escaping RCTPromiseResolveBlock,
                      rejecter _: @escaping RCTPromiseRejectBlock) {
        resolver(nil)
    }

    override func cleanUp() {
        ensureMainThread { [weak self] in
            self?.disableStoredPaymentMethodHandler = nil
            self?.requestOrderHandler = nil
            self?.checkBalanceHandler = nil
            self?.currentComponent = nil
        }
        super.cleanUp()
    }

}
