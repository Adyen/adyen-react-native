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
internal class ApplePayModule: BaseModule {

    private let paymentAuthorizationService: PKPaymentAuthorizationService

    override init() {
      self.paymentAuthorizationService = PKPaymentAuthorizationServiceAdapter()
      super.init()
    }

    init(pkPaymentAuthorizationService: PKPaymentAuthorizationService = PKPaymentAuthorizationServiceAdapter()) {
      self.paymentAuthorizationService = pkPaymentAuthorizationService
      super.init()
    }

    override func supportedEvents() -> [String]! { Events.coreEvents.map(\.rawValue) }

    @objc
    func hide(_ success: NSNumber, event: NSDictionary) {
        dismiss(success.boolValue)
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
            return sendEvent(error: error)
        }

        currentComponent = applePayComponent
        SessionHelperModule.sessionListener = self
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
      let paymentMethod: ApplePayPaymentMethod
      let paymentRequest: PKPaymentRequest
      guard let payment = parser.payment else {
        return resolver(false)
      }

      do {
        let data = try JSONSerialization.data(withJSONObject: paymentMethodDict, options: [])
        paymentMethod = try JSONDecoder().decode(ApplePayPaymentMethod.self, from: data)
        paymentRequest = try applePayParser.buildPaymentRequest(payment: payment)
      } catch {
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

extension ApplePayModule: PaymentComponentDelegate {

    internal func didSubmit(_ data: PaymentComponentData, from component: PaymentComponent) {
        let applePayDetails = data.paymentMethod as? ApplePayDetails
        let response = SubmitData(paymentData: data.jsonObject, extra: applePayDetails?.extraData)
        sendEvent(event: .didSubmit, body: response.jsonObject)
    }

    internal func didFail(with error: Error, from component: PaymentComponent) {
        sendEvent(error: error)
    }

}

extension ApplePayDetails {

    private enum Key {
        static let billingContact = "billingContact"
        static let network = "network"
        static let shippingContact = "shippingContact"
    }

    internal var extraData: [String: Any] {
        [
            Key.billingContact: self.billingContact?.jsonObject,
            Key.network: self.network,
            Key.shippingContact: self.shippingContact?.jsonObject
        ]
    }
}

protocol PKPaymentAuthorizationService {
    func canMakePayments(usingNetworks: [PKPaymentNetwork]) -> Bool
    func getAuthorizationViewController(paymentRequest: PKPaymentRequest) -> PKPaymentAuthorizationViewController?
}

struct PKPaymentAuthorizationServiceAdapter: PKPaymentAuthorizationService {
    func canMakePayments(usingNetworks: [PKPaymentNetwork]) -> Bool {
      return PKPaymentAuthorizationViewController.canMakePayments(usingNetworks: usingNetworks)
    }
    
    func getAuthorizationViewController(paymentRequest: PKPaymentRequest) -> PKPaymentAuthorizationViewController? {
        return PKPaymentAuthorizationViewController(paymentRequest: paymentRequest)
    }
}
