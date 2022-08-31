//
//  AnyPaymentMethod.swift
//  adyen-react-native
//
//  Created by Vladimir on 31/08/2022.
//

import Foundation
import Adyen

internal enum AnyPaymentMethod: Decodable {
    case storedCard(StoredCardPaymentMethod)
    case storedPayPal(StoredPayPalPaymentMethod)
    case storedBCMC(StoredBCMCPaymentMethod)
    case storedRedirect(StoredRedirectPaymentMethod)
    case storedBlik(StoredBLIKPaymentMethod)
    
    case card(AnyCardPaymentMethod)
    case issuerList(IssuerListPaymentMethod)
    case sepaDirectDebit(SEPADirectDebitPaymentMethod)
    case bacsDirectDebit(BACSDirectDebitPaymentMethod)
    case achDirectDebit(ACHDirectDebitPaymentMethod)
    case redirect(RedirectPaymentMethod)
    case applePay(ApplePayPaymentMethod)
    case qiwiWallet(QiwiWalletPaymentMethod)
    case weChatPay(WeChatPayPaymentMethod)
    case mbWay(MBWayPaymentMethod)
    case blik(BLIKPaymentMethod)
    case giftcard(GiftCardPaymentMethod)
    case doku(DokuPaymentMethod)
    case sevenEleven(SevenElevenPaymentMethod)
    case econtextStores(EContextPaymentMethod)
    case econtextATM(EContextPaymentMethod)
    case econtextOnline(EContextPaymentMethod)
    case boleto(BoletoPaymentMethod)
    case affirm(AffirmPaymentMethod)
    case oxxo(OXXOPaymentMethod)
    case multibanco(MultibancoPaymentMethod)
    
    case none
    
    internal var value: PaymentMethod? {
        switch self {
        case let .storedCard(paymentMethod):
            return paymentMethod
        case let .storedPayPal(paymentMethod):
            return paymentMethod
        case let .storedBCMC(paymentMethod):
            return paymentMethod
        case let .storedRedirect(paymentMethod):
            return paymentMethod
        case let .card(paymentMethod):
            return paymentMethod
        case let .issuerList(paymentMethod):
            return paymentMethod
        case let .sepaDirectDebit(paymentMethod):
            return paymentMethod
        case let .bacsDirectDebit(paymentMethod):
            return paymentMethod
        case let .achDirectDebit(paymentMethod):
            return paymentMethod
        case let .redirect(paymentMethod):
            return paymentMethod
        case let .applePay(paymentMethod):
            return paymentMethod
        case let .qiwiWallet(paymentMethod):
            return paymentMethod
        case let .weChatPay(paymentMethod):
            return paymentMethod
        case let .mbWay(paymentMethod):
            return paymentMethod
        case let .blik(paymentMethod):
            return paymentMethod
        case let .storedBlik(paymentMethod):
            return paymentMethod
        case let .doku(paymentMethod):
            return paymentMethod
        case let .giftcard(paymentMethod):
            return paymentMethod
        case let .sevenEleven(paymentMethod):
            return paymentMethod
        case let .econtextStores(paymentMethod):
            return paymentMethod
        case let .econtextATM(paymentMethod):
            return paymentMethod
        case let .econtextOnline(paymentMethod):
            return paymentMethod
        case let .boleto(paymentMethod):
            return paymentMethod
        case let .affirm(paymentMethod):
            return paymentMethod
        case let .oxxo(paymentMethod):
            return paymentMethod
        case let .multibanco(paymentMethod):
            return paymentMethod
        case .none:
            return nil
        }
    }
    
    // MARK: - Decoding
    
    internal init(from decoder: Decoder) throws {
        self = AnyPaymentMethodDecoder.decode(from: decoder)
    }
    
    internal enum CodingKeys: String, CodingKey {
        case type
        case details
        case brand
        case issuers
    }
}

private extension Array where Element == PaymentMethodField {
    var isAnyFieldRequired: Bool {
        contains { $0.isRequired }
    }
}

internal enum PaymentMethodType: String {
    case card
    case scheme
    case ideal
    case entercash
    case eps
    case dotpay
    case openBankingUK = "openbanking_UK"
    case molPayEBankingFPXMY = "molpay_ebanking_fpx_MY"
    case molPayEBankingTH = "molpay_ebanking_TH"
    case molPayEBankingVN = "molpay_ebanking_VN"
    case sepaDirectDebit = "sepadirectdebit"
    case applePay = "applepay"
    case payPal = "paypal"
    case bcmc
    case bcmcMobileQR = "bcmc_mobile_QR"
    case bcmcMobile = "bcmc_mobile"
    case weChatMiniProgram = "wechatpayMiniProgram"
    case weChatQR = "wechatpayQR"
    case qiwiWallet = "qiwiwallet"
    case weChatPayWeb = "wechatpayWeb"
    case weChatPaySDK = "wechatpaySDK"
    case mbWay = "mbway"
    case blik
    case googlePay = "paywithgoogle"
    case afterpay = "afterpay_default"
    case androidPay = "androidpay"
    case amazonPay = "amazonpay"
    case dokuWallet = "doku_wallet"
    case dokuAlfamart = "doku_alfamart"
    case dokuIndomaret = "doku_indomaret"
    case giftcard
    case doku
    case econtextSevenEleven = "econtext_seven_eleven"
    case econtextStores = "econtext_stores"
    case econtextATM = "econtext_atm"
    case econtextOnline = "econtext_online"
    case boleto = "boletobancario_santander"
    case affirm
    case oxxo
    case bacsDirectDebit = "directdebit_GB"
    case achDirectDebit = "ach"
    case multibanco
}

private struct PaymentMethodField: Decodable {
    
    fileprivate var key: String
    
    fileprivate var type: String
    
    fileprivate var isOptional: Bool?
    
    fileprivate var isRequired: Bool {
        isOptional.map { !$0 } ?? true
    }
    
    private enum CodingKeys: String, CodingKey {
        case key, type, isOptional = "optional"
    }
    
}

internal enum AnyPaymentMethodDecoder {
    private static var decoders: [PaymentMethodType: PaymentMethodDecoder] = [

        // Unsupported payment methods
        .bcmcMobileQR: UnsupportedPaymentMethodDecoder(),
        .weChatMiniProgram: UnsupportedPaymentMethodDecoder(),
        .weChatQR: UnsupportedPaymentMethodDecoder(),
        .weChatPayWeb: UnsupportedPaymentMethodDecoder(),
        .googlePay: UnsupportedPaymentMethodDecoder(),
        .afterpay: UnsupportedPaymentMethodDecoder(),
        .androidPay: UnsupportedPaymentMethodDecoder(),
        .amazonPay: UnsupportedPaymentMethodDecoder(),
        
        // Supported payment methods
        .card: CardPaymentMethodDecoder(),
        .scheme: CardPaymentMethodDecoder(),
        .ideal: IssuerListPaymentMethodDecoder(),
        .entercash: IssuerListPaymentMethodDecoder(),
        .eps: IssuerListPaymentMethodDecoder(),
        .dotpay: IssuerListPaymentMethodDecoder(),
        .openBankingUK: IssuerListPaymentMethodDecoder(),
        .molPayEBankingFPXMY: IssuerListPaymentMethodDecoder(),
        .molPayEBankingTH: IssuerListPaymentMethodDecoder(),
        .molPayEBankingVN: IssuerListPaymentMethodDecoder(),
        .sepaDirectDebit: SEPADirectDebitPaymentMethodDecoder(),
        .bacsDirectDebit: BACSDirectDebitPaymentMethodDecoder(),
        .achDirectDebit: ACHDirectDebitPaymentMethodDecoder(),
        .applePay: ApplePayPaymentMethodDecoder(),
        .payPal: PayPalPaymentMethodDecoder(),
        .bcmc: BCMCCardPaymentMethodDecoder(),
        .weChatPaySDK: WeChatPayPaymentMethodDecoder(),
        .qiwiWallet: QiwiWalletPaymentMethodDecoder(),
        .mbWay: MBWayPaymentMethodDecoder(),
        .blik: BLIKPaymentMethodDecoder(),
        .dokuWallet: DokuPaymentMethodDecoder(),
        .dokuAlfamart: DokuPaymentMethodDecoder(),
        .dokuIndomaret: DokuPaymentMethodDecoder(),
        .giftcard: GiftCardPaymentMethodDecoder(),
        .econtextSevenEleven: SevenElevenPaymentMethodDecoder(),
        .econtextStores: EContextStoresPaymentMethodDecoder(),
        .econtextATM: EContextATMPaymentMethodDecoder(),
        .econtextOnline: EContextOnlinePaymentMethodDecoder(),
        .boleto: BoletoPaymentMethodDecoder(),
        .affirm: AffirmPaymentMethodDecoder(),
        .oxxo: OXXOPaymentMethodDecoder(),
        .multibanco: MultibancoPaymentMethodDecoder()
    ]
    
    private static var defaultDecoder: PaymentMethodDecoder = RedirectPaymentMethodDecoder()
    
    internal static func decode(from decoder: Decoder) -> AnyPaymentMethod {
        do {
            let container = try decoder.container(keyedBy: AnyPaymentMethod.CodingKeys.self)
            let type = try container.decode(String.self, forKey: .type)
            let isStored = decoder.codingPath.contains { $0.stringValue == CodingKeys.stored.stringValue }
            let brand = try? container.decode(String.self, forKey: .brand)
            let isIssuersList = container.contains(.issuers)

            if isIssuersList {
                return try IssuerListPaymentMethodDecoder().decode(from: decoder, isStored: isStored)
            }
            
            // This is a hack to handle stored Bancontact as a separate
            // payment method, even though Bancontact is just another
            // scheme of a card payment method,
            // Since Bancontact doesn't need CVC.
            // Please consider using a composite matching hashable struct,
            // That includes brand, type, isStored, and requiresDetails,
            // This matching struct will be used as the key to the decoders
            // dictionary.
            if isStored, brand == "bcmc", type == "scheme" {
                return try decoders[.bcmc, default: defaultDecoder].decode(from: decoder, isStored: true)
            }
            
            let paymentDecoder = PaymentMethodType(rawValue: type).map { decoders[$0, default: defaultDecoder] } ?? defaultDecoder
            
            return try paymentDecoder.decode(from: decoder, isStored: isStored)
        } catch {
            return .none
        }
    }
    
    internal enum CodingKeys: String, CodingKey {
        case regular = "paymentMethods"
        case stored = "storedPaymentMethods"
    }
}

private protocol PaymentMethodDecoder {
    func decode(from decoder: Decoder, isStored: Bool) throws -> AnyPaymentMethod
}

private struct CardPaymentMethodDecoder: PaymentMethodDecoder {
    func decode(from decoder: Decoder, isStored: Bool) throws -> AnyPaymentMethod {
        if isStored {
            return .storedCard(try StoredCardPaymentMethod(from: decoder))
        } else {
            return .card(try CardPaymentMethod(from: decoder))
        }
    }
}

private struct BCMCCardPaymentMethodDecoder: PaymentMethodDecoder {
    func decode(from decoder: Decoder, isStored: Bool) throws -> AnyPaymentMethod {
        if isStored {
            return .storedBCMC(try StoredBCMCPaymentMethod(from: decoder))
        } else {
            return .card(try BCMCPaymentMethod(from: decoder))
        }
    }
}

private struct IssuerListPaymentMethodDecoder: PaymentMethodDecoder {
    func decode(from decoder: Decoder, isStored: Bool) throws -> AnyPaymentMethod {
        .issuerList(try IssuerListPaymentMethod(from: decoder))
    }
}

private struct SEPADirectDebitPaymentMethodDecoder: PaymentMethodDecoder {
    func decode(from decoder: Decoder, isStored: Bool) throws -> AnyPaymentMethod {
        .sepaDirectDebit(try SEPADirectDebitPaymentMethod(from: decoder))
    }
}

private struct BACSDirectDebitPaymentMethodDecoder: PaymentMethodDecoder {
    func decode(from decoder: Decoder, isStored: Bool) throws -> AnyPaymentMethod {
        .bacsDirectDebit(try BACSDirectDebitPaymentMethod(from: decoder))
    }
}

private struct ACHDirectDebitPaymentMethodDecoder: PaymentMethodDecoder {
    func decode(from decoder: Decoder, isStored: Bool) throws -> AnyPaymentMethod {
        .achDirectDebit(try ACHDirectDebitPaymentMethod(from: decoder))
    }
}

private struct ApplePayPaymentMethodDecoder: PaymentMethodDecoder {
    func decode(from decoder: Decoder, isStored: Bool) throws -> AnyPaymentMethod {
        .applePay(try ApplePayPaymentMethod(from: decoder))
    }
}

private struct PayPalPaymentMethodDecoder: PaymentMethodDecoder {
    func decode(from decoder: Decoder, isStored: Bool) throws -> AnyPaymentMethod {
        return try RedirectPaymentMethodDecoder().decode(from: decoder, isStored: isStored)
    }
}

private struct RedirectPaymentMethodDecoder: PaymentMethodDecoder {
    func decode(from decoder: Decoder, isStored: Bool) throws -> AnyPaymentMethod {
        if isStored {
            return .storedRedirect(try StoredRedirectPaymentMethod(from: decoder))
        } else {
            return .redirect(try RedirectPaymentMethod(from: decoder) )
        }
    }
}

private struct WeChatPayPaymentMethodDecoder: PaymentMethodDecoder {
    func decode(from decoder: Decoder, isStored: Bool) throws -> AnyPaymentMethod {
        .weChatPay(try WeChatPayPaymentMethod(from: decoder))
    }
}

private struct UnsupportedPaymentMethodDecoder: PaymentMethodDecoder {
    func decode(from decoder: Decoder, isStored: Bool) throws -> AnyPaymentMethod {
        .none
    }
}

private struct QiwiWalletPaymentMethodDecoder: PaymentMethodDecoder {
    func decode(from decoder: Decoder, isStored: Bool) throws -> AnyPaymentMethod {
        .qiwiWallet(try QiwiWalletPaymentMethod(from: decoder))
    }
}

private struct MBWayPaymentMethodDecoder: PaymentMethodDecoder {
    func decode(from decoder: Decoder, isStored: Bool) throws -> AnyPaymentMethod {
        .mbWay(try MBWayPaymentMethod(from: decoder))
    }
}

private struct BLIKPaymentMethodDecoder: PaymentMethodDecoder {
    func decode(from decoder: Decoder, isStored: Bool) throws -> AnyPaymentMethod {
        if isStored {
            return .storedBlik(try StoredBLIKPaymentMethod(from: decoder))
        } else {
            return .blik(try BLIKPaymentMethod(from: decoder))
        }
    }
}

private struct DokuPaymentMethodDecoder: PaymentMethodDecoder {
    func decode(from decoder: Decoder, isStored: Bool) throws -> AnyPaymentMethod {
        .doku(try DokuPaymentMethod(from: decoder))
    }
}

private struct GiftCardPaymentMethodDecoder: PaymentMethodDecoder {
    func decode(from decoder: Decoder, isStored: Bool) throws -> AnyPaymentMethod {
        .giftcard(try GiftCardPaymentMethod(from: decoder))
    }
}

private struct SevenElevenPaymentMethodDecoder: PaymentMethodDecoder {
    func decode(from decoder: Decoder, isStored: Bool) throws -> AnyPaymentMethod {
        .sevenEleven(try SevenElevenPaymentMethod(from: decoder))
    }
}

private struct EContextStoresPaymentMethodDecoder: PaymentMethodDecoder {
    func decode(from decoder: Decoder, isStored: Bool) throws -> AnyPaymentMethod {
        .econtextStores(try EContextPaymentMethod(from: decoder))
    }
}

private struct EContextATMPaymentMethodDecoder: PaymentMethodDecoder {
    func decode(from decoder: Decoder, isStored: Bool) throws -> AnyPaymentMethod {
        .econtextATM(try EContextPaymentMethod(from: decoder))
    }
}

private struct EContextOnlinePaymentMethodDecoder: PaymentMethodDecoder {
    func decode(from decoder: Decoder, isStored: Bool) throws -> AnyPaymentMethod {
        .econtextOnline(try EContextPaymentMethod(from: decoder))
    }
}

private struct BoletoPaymentMethodDecoder: PaymentMethodDecoder {
    func decode(from decoder: Decoder, isStored: Bool) throws -> AnyPaymentMethod {
        .boleto(try BoletoPaymentMethod(from: decoder))
    }
}

private struct AffirmPaymentMethodDecoder: PaymentMethodDecoder {
    func decode(from decoder: Decoder, isStored: Bool) throws -> AnyPaymentMethod {
        .affirm(try AffirmPaymentMethod(from: decoder))
    }
}

private struct OXXOPaymentMethodDecoder: PaymentMethodDecoder {
    func decode(from decoder: Decoder, isStored: Bool) throws -> AnyPaymentMethod {
        .oxxo(try OXXOPaymentMethod(from: decoder))
    }
}

private struct MultibancoPaymentMethodDecoder: PaymentMethodDecoder {
    func decode(from decoder: Decoder, isStored: Bool) throws -> AnyPaymentMethod {
        .multibanco(try MultibancoPaymentMethod(from: decoder))
    }
}
