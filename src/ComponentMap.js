
export function find(paymentMethods, type) {
    return paymentMethods.paymentMethods.find(pm => pm.type === mapCreatedComponentType(type));
}

function mapCreatedComponentType(pmType) {
    // Components created as 'card' need to be matched with paymentMethod response objects with type 'scheme'
    return pmType === 'card' ? 'scheme' : pmType;
}

export const naviveComponents = [
    card, scheme, ideal, entercash, eps, dotpay, openbanking_UK, openBankingUK, molpay_ebanking_fpx_MY, molPayEBankingFPXMY, molpay_ebanking_TH, molPayEBankingTH, molpay_ebanking_VN, molPayEBankingVN, sepadirectdebit, sepaDirectDebit, applepay, applePay, paypal, payPal, bcmc, bcmc_mobile_QR, bcmcMobileQR, bcmc_mobile, bcmcMobile, wechatpayMiniProgram, weChatMiniProgram, wechatpayQR, weChatQR, qiwiwallet, qiwiWallet, wechatpayWeb, weChatPayWeb, wechatpaySDK, weChatPaySDK, mbway, mbWay, blik, paywithgoogle, googlePay, afterpay_default, afterpay, androidpay, androidPay, amazonpay, amazonPay, doku_wallet, dokuWallet, doku_alfamart, dokuAlfamart, doku_indomaret, dokuIndomaret, giftcard, doku, econtext_seven_eleven, econtextSevenEleven, econtext_stores, econtextStores, econtext_atm, econtextATM, econtext_online, econtextOnline, boletobancario_santander, boleto, affirm, oxxo, directdebit_GB, bacsDirectDebit, ach, achDirectDebit, multibanco 
];