import { ResultCode } from '@adyen/react-native';

export const isSuccess = (
    /** @type {import('@adyen/react-native').PaymentResponse} */
    result,
  ) => {
    const code = result.resultCode;
    return code === ResultCode.authorised ||
      code === ResultCode.received ||
      code === ResultCode.pending || 
      code === ResultCode.presentToShopper;
  };