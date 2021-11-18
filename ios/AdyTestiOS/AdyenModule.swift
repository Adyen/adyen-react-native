//
//  AdyenModule.swift
//  AdyTestiOS
//
//  Created by vm on 06/09/2021.
//

import Foundation
import Adyen
import React

@objc(AdyenDropIn)
class AdyenDropIn: RCTEventEmitter {
  
  private var didSubmitCallback: RCTResponseSenderBlock?
  private var didProvideCallback: RCTResponseSenderBlock?
  private var didCompleteCallback: RCTResponseSenderBlock?
  private var didFailCallback: RCTResponseSenderBlock?
  private var didCancelCallback: RCTResponseSenderBlock?
  private var didOpenExternalApplicationCallback: RCTResponseSenderBlock?
  
  private var dropInComponent: DropInComponent?
  
  @objc
  override func constantsToExport() -> [AnyHashable : Any]! {
    return ["CHANNEL": "iOS"]
  }
  
  @objc
  override static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  override func stopObserving() { }
  
  override func startObserving() { }
  
  override func supportedEvents() -> [String]! {
    ["didSubmitCallback", "didProvideCallback", "didCompleteCallback", "didFailCallback"]
  }
  
  @objc func hideDropIn() {
    DispatchQueue.main.async {
      UIApplication.shared.keyWindow?.rootViewController?.dismiss(animated: true, completion: nil)
    }
  }
   
  @objc func openDropIn(_ paymentMethods : NSDictionary, configuration: NSDictionary) {
    guard let data = try? JSONSerialization.data(withJSONObject: paymentMethods, options: []),
          let paymentMethods = try? JSONDecoder().decode(PaymentMethods.self, from: data)
    else { return }
    
    guard
      let environment = configuration["environment"] as? String,
      let clientKey = configuration["clientKey"] as? String
    else { return }
    
    let apiContext = APIContext(environment: Environment.parse(environment), clientKey: clientKey)
    let config = DropInComponent.Configuration(apiContext: apiContext)
    
    if let paymentAmount = configuration["applepayMerchantID"] as? Int,
       let countryCode = configuration["countryCode"] as? String,
       let currencyCode = configuration["currencyCode"] as? String {
      config.payment = Payment(amount: Amount(value: paymentAmount,
                                              currencyCode: currencyCode),
                               countryCode: countryCode)
    }
    
//    let styleDict = configuration["style"] as? NSDictionary
//    let style: DropInComponent.Style?
//    if let data = try? JSONSerialization.data(withJSONObject: styleDict, options: []),
//          let style = try? JSONDecoder().decode(DropInComponent.Style.self, from: data)
//    else { return }

    
//    if let merchantId = configuration["applepayMerchantID"] as? String {
//      configuration.applePay = .init(summaryItems: nil,
//                                     merchantIdentifier: merchantId)
//    }
    
    let dropInComponentStyle = DropInComponent.Style()
    let component = DropInComponent(paymentMethods: paymentMethods,
                                    configuration: config,
                                    style: dropInComponentStyle)
    component.delegate = self
//    component.partialPaymentDelegate = self
    dropInComponent = component
    
    DispatchQueue.main.async {
      UIApplication.shared.keyWindow?.rootViewController?.present(
        component.viewController,
        animated: true,
        completion: nil)
    }
  }

  @objc func handle(_ action: NSDictionary) {
    guard let data = try? JSONSerialization.data(withJSONObject: action, options: []),
          let action = try? JSONDecoder().decode(Action.self, from: data)
    else { return }

    dropInComponent?.handle(action)
  }
  
}

extension AdyenDropIn: DropInComponentDelegate {
  
  func didSubmit(_ data: PaymentComponentData,
                 for paymentMethod: PaymentMethod,
                 from component: DropInComponent) {
    sendEvent(withName: "didSubmitCallback", body: data.jsonObject)
  }
  
  func didProvide(_ data: ActionComponentData, from component: DropInComponent) {
    sendEvent(withName: "didProvideCallback", body: data.jsonObject)
  }
  
  func didComplete(from component: DropInComponent) {
    sendEvent(withName: "didCompleteCallback", body: nil)
  }
  
  func didFail(with error: Error, from component: DropInComponent) {
    sendEvent(withName: "didFailCallback", body: error as NSError)
  }
  
}

extension Encodable {
  var jsonDictionary: [String: Any] {
    guard let data = try? JSONEncoder().encode(self),
          let object = try? JSONSerialization.jsonObject(with: data, options: []) as? [String : Any] else {
      return [:]
    }
    
    return object
  }
}

extension PaymentComponentData {
  var jsonObject: [String: Any] {
    EncodablePaymentComponentData(data: self).jsonDictionary
  }
}

extension PaymentMethod {
  var jsonObject: [String: Any] {
    return EncodablePaymentMethod(paymentMethod: self).jsonDictionary
  }
}

extension ActionComponentData {
  var jsonObject: [String: Any] {
    return EncodableActionData(data: self).jsonDictionary
  }
}

fileprivate struct EncodablePaymentMethod: Encodable {
  let paymentMethod: PaymentMethod
  
  public func encode(to encoder: Encoder) throws {
    var container = encoder.container(keyedBy: CodingKeys.self)
    try container.encode(paymentMethod.name, forKey: .name)
    try container.encode(paymentMethod.type, forKey: .type)
  }
  
  public enum CodingKeys: CodingKey {
    case name
    case type
  }
}

fileprivate struct EncodablePaymentComponentData: Encodable {
  let data: PaymentComponentData
  
  internal func encode(to encoder: Encoder) throws {
    var container = encoder.container(keyedBy: CodingKeys.self)
    
    try container.encode(data.paymentMethod.encodable, forKey: .details)
    try container.encode(data.storePaymentMethod, forKey: .storePaymentMethod)
    try container.encodeIfPresent(data.browserInfo, forKey: .browserInfo)
    try container.encodeIfPresent(data.shopperName, forKey: .shopperName)
    try container.encodeIfPresent(data.emailAddress, forKey: .shopperEmail)
    try container.encodeIfPresent(data.telephoneNumber, forKey: .telephoneNumber)
    try container.encodeIfPresent(data.billingAddress, forKey: .billingAddress)
    try container.encodeIfPresent(data.deliveryAddress, forKey: .deliveryAddress)
    try container.encodeIfPresent(data.socialSecurityNumber, forKey: .socialSecurityNumber)
    try container.encodeIfPresent(data.order?.compactOrder, forKey: .order)
    //      try container.encodeIfPresent(data.installments, forKey: .installments)
  }
  
  private enum CodingKeys: String, CodingKey {
    case details = "paymentMethod"
    case storePaymentMethod
    case browserInfo
    case shopperName
    case shopperEmail
    case telephoneNumber
    case billingAddress
    case deliveryAddress
    case socialSecurityNumber
    case order
    case installments
  }
}

fileprivate struct EncodableActionData: Encodable {
  let data: ActionComponentData
  
  internal func encode(to encoder: Encoder) throws {
    var container = encoder.container(keyedBy: CodingKeys.self)
    try container.encode(data.details.encodable, forKey: .details)
    try container.encode(data.paymentData, forKey: .paymentData)
  }
  
  private enum CodingKeys: String, CodingKey {
      case details
      case paymentData
  }
}

@objc class RedirectComponentProxy: NSObject {
  
  @objc class func openURL(_ url: NSURL) {
    RedirectComponent.applicationDidOpen(from: url as URL)
  }
  
}

extension Environment {
  
  internal static func parse(_ value: String) -> Environment {
    switch value.lowercased() {
    case "beta": return .beta
    case "live", "liveeurope": return .liveEurope
    case "liveaustralia": return .liveAustralia
    case "liveunitedstates": return .liveUnitedStates
    default:
      return .test
    }
  }
  
}
