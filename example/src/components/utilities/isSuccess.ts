import { ResultCode } from '@adyen/react-native';

export const isSuccess = (code: ResultCode) =>
  [
    ResultCode.authorised,
    ResultCode.received,
    ResultCode.pending,
    ResultCode.presentToShopper,
  ].includes(code);