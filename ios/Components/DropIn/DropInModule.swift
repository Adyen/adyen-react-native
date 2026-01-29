//
// Copyright (c) 2021 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Foundation
import PassKit
import React

@objc(AdyenDropIn)
internal final class DropInModule: BaseAddressLookup {

    internal var disableStoredPaymentMethodHandler: Adyen.Completion<Bool>?
    internal var requestOrderHandler: ((Result<PartialPaymentOrder, any Error>) -> Void)?
    internal var checkBalanceHandler: ((Result<Balance, any Error>) -> Void)?

    override func supportedEvents() -> [String]! { Events.allCases.map(\.rawValue) }

    private var dropInComponent: DropInComponent? {
        currentComponent as? DropInComponent
    }

    @objc
    func removeStored(_ success: NSNumber) {
        DispatchQueue.main.async { [weak self] in
            self?.disableStoredPaymentMethodHandler?(success.boolValue)
        }
    }

    @objc
    func open(_ paymentMethodsDict: NSDictionary, configuration: NSDictionary) {
        let parser = RootConfigurationParser(configuration: configuration)
        let paymentMethods: PaymentMethods
        let context: AdyenContext
        do {
            paymentMethods = try parsePaymentMethods(from: paymentMethodsDict)
            context = try parser.fetchContext(session: BaseModule.session)
        } catch {
            return sendError(error: error)
        }

        let dropInConfigParser = DropInConfigurationParser(configuration: configuration)
        let config = dropInConfigParser.configuration
        config.card = CardConfigurationParser(configuration: configuration, delegate: self).dropinConfiguration
        config.style = AdyenAppearanceLoader.findStyle() ?? DropInComponent.Style()
        if let locale = BaseModule.session?.sessionContext.shopperLocale ?? parser.shopperLocale {
            config.localizationParameters = LocalizationParameters(enforcedLocale: locale)
        }
        if let requestorAppUrl = ThreeDS2ConfigurationParser(configuration: configuration).requestorAppUrl,
           let url = URL(string: requestorAppUrl) {
            config.actionComponent.threeDS.requestorAppURL = url
        }
        if let payment = context.payment {
            (try? ApplepayConfigurationParser(configuration: configuration).buildConfiguration(payment: payment)).map {
                config.applePay = $0
            }
        }
        let partialPaymentParser = PartialPaymentParser(configuration: configuration)
        config.giftCard.showsSecurityCodeField = partialPaymentParser.pinRequired

        let component = DropInComponent(paymentMethods: paymentMethods,
                                        context: context,
                                        configuration: config,
                                        title: dropInConfigParser.title)
        currentComponent = component
        component.delegate = BaseModule.session ?? self
        component.partialPaymentDelegate = BaseModule.session ?? self
        component.storedPaymentMethodsDelegate = BaseModule.session ?? self
        component.cardComponentDelegate = self
        present(component: component)
    }

    @objc
    func handle(_ dictionary: NSDictionary) {
        let action: Action
        do {
            action = try parseAction(from: dictionary)
        } catch {
            return sendError(error: error)
        }

        DispatchQueue.main.async { [weak self] in
            self?.dropInComponent?.handle(action)
        }
    }

    @objc
    func getReturnURL(_ resolver: @escaping RCTPromiseResolveBlock,
                      rejecter: @escaping RCTPromiseRejectBlock) {
        resolver(nil)
    }

    override func cleanUp() {
        disableStoredPaymentMethodHandler = nil
        requestOrderHandler = nil
        checkBalanceHandler = nil
        super.cleanUp()
    }

}
