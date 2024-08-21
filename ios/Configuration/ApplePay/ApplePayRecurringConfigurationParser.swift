//
//  ApplePayRecurringConfigurationParser.swift
//  adyen-react-native
//
//  Created by Vladimir Abramichev on 21/08/2024.
//

import PassKit

class ApplePayRecurringConfigurationParser {
    
    private var dict: [String: Any]

    public init(configuration: NSDictionary) {
        guard let configuration = configuration as? [String: Any] else {
            self.dict = [:]
            return
        }
        if let configurationNode = configuration[ApplePayKeys.recurringPaymentRequest] as? [String: Any] {
            self.dict = configurationNode
        } else {
            self.dict = configuration
        }
    }

    // A description of the recurring payment, for example "Apple News+".
    var paymentDescription: String? {
        return dict[ApplePayKeys.Recurring.paymentDescription] as? String
    }

    // The regular billing cycle, for example "$9.99 monthly".
    @available(iOS 15.0, *)
    var regularBilling: PKRecurringPaymentSummaryItem? {
        guard let dictionary = dict[ApplePayKeys.Recurring.regularBilling] as? [NSString: Any] else {
            return nil
        }
        return .init(dictionary)
    }

    // Optional, trial billing cycle, for example "$1.99 for the first six months".
    @available(iOS 15.0, *)
    var trialBilling: PKRecurringPaymentSummaryItem? {
        guard let dictionary = dict[ApplePayKeys.Recurring.trialBilling] as? [NSString: Any] else {
            return nil
        }
        return .init(dictionary)
    }

    // Optional, localized billing agreement to be displayed to the user prior to payment authorization.
    var billingAgreement: String? {
        return dict[ApplePayKeys.Recurring.billingAgreement] as? String
    }

    // A URL that links to a page on your web site where the user can manage the payment method for this
    // recurring payment, including deleting it.
    var managementURL: URL? {
        guard let url = dict[ApplePayKeys.Recurring.managementURL] as? String else { return nil }
        return URL(string: url)
    }

    // Optional URL to receive lifecycle notifications for the merchant-specific payment token issued
    // for this request, if applicable. If this property is not set, notifications will not be sent when
    // lifecycle changes occur for the token, for example when the token is deleted.
    var tokenNotificationURL: URL? {
        guard let url = dict[ApplePayKeys.Recurring.tokenNotificationURL] as? String else { return nil }
        return URL(string: url)
    }

    @available(iOS 16.0, *)
    public var paymentRequest: PKRecurringPaymentRequest? {
        guard let paymentDescription, let regularBilling, let managementURL else {
            return nil
        }

        let recurringRequest = PKRecurringPaymentRequest(paymentDescription: paymentDescription,
                                                         regularBilling: regularBilling,
                                                         managementURL: managementURL)
        recurringRequest.tokenNotificationURL = tokenNotificationURL
        recurringRequest.trialBilling = trialBilling
        recurringRequest.billingAgreement = billingAgreement

        return recurringRequest
    }
}
