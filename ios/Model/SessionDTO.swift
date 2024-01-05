//
//  SessionDTO.swift
//  adyen-react-native
//
//  Created by Vladimir Abramichev on 05/01/2024.
//

import Foundation
import Adyen

struct SessionDTO {
    let id: String
    let sessionData: String
    let amount: Amount
    let expiresAt: String?
    let paymentMethods: [String: Any]
    let configuration: [String: Any]?

    init(session: AdyenSession) {
        id = session.sessionContext.identifier
        sessionData = session.sessionContext.data
        amount = session.sessionContext.amount
        expiresAt = nil
        paymentMethods = session.sessionContext.paymentMethods.jsonObject
        configuration = nil
    }

    var jsonObject: [String: Any] {
        var dict = [String: Any]()
        dict["id"] = id
        dict["sessionData"] = sessionData
        dict["amount"] = amount
        dict["paymentMethods"] = paymentMethods
        return dict
    }

    private enum CodingKeys: String {
        case id, sessionData, amount, expiresAt, paymentMethods, configuration
    }
}


extension PaymentMethods {
    var jsonObject: [String: Any] {
        var dict = [String: Any]()
        dict["storedPaymentMethods"] = self.stored.map { $0.jsonObject }
        dict["paymentMethods"] = self.regular.map { $0.jsonObject }
        return dict
    }
}
