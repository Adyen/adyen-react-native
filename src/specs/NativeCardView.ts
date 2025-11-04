import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import type { ViewProps } from 'react-native';
import type { DirectEventHandler } from 'react-native/Libraries/Types/CodegenTypes';

type PayButtonPressedEvent = Readonly<{}>;

export interface NativeProps extends ViewProps {
  /** Serialized PaymentMethod object (JSON string) */
  paymentMethod: string;
  /** Serialized Configuration object (JSON string) */
  configuration: string;
  showButton?: boolean;
  onButtonPress?: DirectEventHandler<PayButtonPressedEvent>;
}

export default codegenNativeComponent<NativeProps>('CardView');
