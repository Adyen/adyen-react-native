import {ResultCode} from '@adyen/react-native';

export const isSuccess = ({resultCode}) =>
  [
    ResultCode.authorised,
    ResultCode.received,
    ResultCode.pending,
    ResultCode.presentToShopper,
  ].includes(resultCode);
