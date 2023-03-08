// @ts-check

/**
 * Find payment method in JSON response or \paymentMethods API
 * @param {{ paymentMethods: any[]; }} paymentMethods Json response from /paymentMethods
 * @param {string} typeName Name of payment method type
 * @returns {import("./AdyenNativeModules").PaymentMethod} Payment method object with a specified type
 */
export function find(paymentMethods, typeName) {
  return paymentMethods.paymentMethods.find(
    (pm) => pm.type.toLowerCase() === mapCreatedComponentType(typeName)
  );
}

/**
 * Map component name to txVariable name from \paymentMethod response
 * @param {string} pmType
 * @returns {string} matching txVariable name or original name
 */
function mapCreatedComponentType(pmType) {
  // Components created as 'card' need to be matched with paymentMethod response objects with type 'scheme'
  return pmType === 'card' ? 'scheme' : pmType;
}

export const NATIVE_COMPONENTS = [
  'card',
  'scheme',
  'ideal',
  'entercash',
  'eps',
  'dotpay',
  'openbanking_uk',
  'openbankinguk',
  'molpay_ebanking_fpx_my',
  'molpayebankingfpxmy',
  'molpay_ebanking_th',
  'molpayebankingth',
  'molpay_ebanking_vn',
  'molpayebankingvn',
  'sepadirectdebit',
  'bcmc',
  'bcmc_mobile_qr',
  'bcmcmobileqr',
  'bcmc_mobile',
  'bcmcmobile',
  'wechatpayminiprogram',
  'wechatminiprogram',
  'wechatpayqr',
  'wechatqr',
  'qiwiwallet',
  'qiwiwallet',
  'wechatpayweb',
  'wechatpayweb',
  'wechatpaysdk',
  'wechatpaysdk',
  'mbway',
  'mbway',
  'blik',
  'afterpay_default',
  'afterpay',
  'androidpay',
  'amazonpay',
  'doku_wallet',
  'dokuwallet',
  'doku_alfamart',
  'dokualfamart',
  'doku_indomaret',
  'dokuindomaret',
  'giftcard',
  'doku',
  'econtext_seven_eleven',
  'econtextseveneleven',
  'econtext_stores',
  'econtextstores',
  'econtext_atm',
  'econtextatm',
  'econtext_online',
  'econtextonline',
  'boletobancario_santander',
  'boleto',
  'affirm',
  'oxxo',
  'directdebit_gb',
  'bacsdirectdebit',
  'ach',
  'achdirectdebit',
  'multibanco',
];
