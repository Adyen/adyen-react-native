//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Foundation
import PassKit
import React

@objc(AdyenApplePay)
internal class ApplePayModule: BaseModuleSender {

    override func supportedEvents() -> [String]! {
        Events.coreEvents.map(\.rawValue)
    }

    private let paymentAuthorizationService: PKPaymentAuthorizationService

    override init() {
        self.paymentAuthorizationService = PKPaymentAuthorizationServiceAdapter()
        super.init()
    }

    init(pkPaymentAuthorizationService: PKPaymentAuthorizationService = PKPaymentAuthorizationServiceAdapter()) {
        self.paymentAuthorizationService = pkPaymentAuthorizationService
        super.init()
    }

    @objc
    func open(_ paymentMethodsDict: NSDictionary, configuration: NSDictionary) {
        let parser = RootConfigurationParser(configuration: configuration)
        let applePayParser = ApplepayConfigurationParser(configuration: configuration)
        let applePayComponent: ApplePayComponent
        do {
            let paymentMethod = try parsePaymentMethod(from: paymentMethodsDict, for: ApplePayPaymentMethod.self)
            let context = try parser.fetchContext(session: BaseModule.session)
            guard let payment = context.payment else { throw NativeModuleError.noPayment }
            let applepayConfig = try applePayParser.buildConfiguration(payment: payment)
            applePayComponent = try Adyen.ApplePayComponent(paymentMethod: paymentMethod,
                                                            context: context,
                                                            configuration: applepayConfig)
        } catch {
            return sendError(error: error)
        }

        currentComponent = applePayComponent
        applePayComponent.delegate = BaseModule.session ?? self
        present(component: applePayComponent)
    }

    @objc
    func isAvailable(_ paymentMethodDict: NSDictionary,
                     configuration: NSDictionary,
                     resolver: @escaping RCTPromiseResolveBlock,
                     rejecter: @escaping RCTPromiseRejectBlock) {
        let parser = RootConfigurationParser(configuration: configuration)
        let applePayParser = ApplepayConfigurationParser(configuration: configuration)

        let paymentRequest: PKPaymentRequest
        guard let payment = parser.payment else {
            return resolver(false)
        }

        do {
            paymentRequest = try applePayParser.buildPaymentRequest(payment: payment)
        } catch {
            return resolver(false)
        }

        guard let paymentMethod: ApplePayPaymentMethod = try? paymentMethodDict.decode() else {
            return resolver(false)
        }

        let supportedNetworks = paymentMethod.supportedNetworks
        guard applePayParser.allowOnboarding || paymentAuthorizationService.canMakePayments(usingNetworks: supportedNetworks) else {
            return resolver(false)
        }

        paymentRequest.supportedNetworks = supportedNetworks
        guard let _ = paymentAuthorizationService.getAuthorizationViewController(paymentRequest: paymentRequest) else {
            return resolver(false)
        }

        return resolver(true)
    }

}

protocol PKPaymentAuthorizationService {
    func canMakePayments(usingNetworks: [PKPaymentNetwork]) -> Bool
    func getAuthorizationViewController(paymentRequest: PKPaymentRequest) -> PKPaymentAuthorizationViewController?
}

struct PKPaymentAuthorizationServiceAdapter: PKPaymentAuthorizationService {
    func canMakePayments(usingNetworks: [PKPaymentNetwork]) -> Bool {
        PKPaymentAuthorizationViewController.canMakePayments(usingNetworks: usingNetworks)
    }

    func getAuthorizationViewController(paymentRequest: PKPaymentRequest) -> PKPaymentAuthorizationViewController? {
        PKPaymentAuthorizationViewController(paymentRequest: paymentRequest)
    }
}
