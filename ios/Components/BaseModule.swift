//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import React
import UIKit
import Adyen

internal class BaseModule: RCTEventEmitter {
    
    private enum Error: LocalizedError {
        case deserializationError
        case parsingError
        case paymentMethodNotFound(PaymentMethod.Type)
        
        var errorDescription: String? {
            switch self {
            case .deserializationError:
                return "Can not deserialize paymentMethods"
            case .parsingError:
                return "Can not parse payment method"
            case let .paymentMethodNotFound(type):
                return "Can not find payment method of type \(type) in provided list"
            }
        }
    }

    override open func supportedEvents() -> [String]! { Events.allCases.map(\.rawValue) }
    
    internal func sendEvent(event: Events, body: Any!) {
        self.sendEvent(withName: event.rawValue, body: body)
    }
    
    internal func parsePaymentMethods(jsonData: NSDictionary) throws -> PaymentMethods {
        let paymentMethods: PaymentMethods
        
        guard let data = try? JSONSerialization.data(withJSONObject: jsonData, options: []) else {
            throw Error.deserializationError
        }
        
        if let jsonPaymentMethods = try? JSONDecoder().decode(PaymentMethods.self, from: data) {
            paymentMethods = jsonPaymentMethods
        }
        else if let jsonPaymentMethod = try? JSONDecoder().decode(AnyPaymentMethod.self, from: data),
                let anyPaymentMethod = jsonPaymentMethod.value {
            paymentMethods = PaymentMethods(regular: [anyPaymentMethod], stored: [])
        }
        else {
            throw Error.parsingError
        }
        
        return paymentMethods
    }
    
    internal func parsePaymentMethods<T: PaymentMethod>(jsonData: NSDictionary, for type: T.Type) throws -> T {
        let paymentMethods = try parsePaymentMethods(jsonData: jsonData)
        
        guard let paymentMethod = paymentMethods.paymentMethod(ofType: type) else {
            throw Error.paymentMethodNotFound(type)
        }
        
        return paymentMethod
    }
    
}
