import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import type { ViewProps } from 'react-native';
import type {
  DirectEventHandler,
  Int32,
} from 'react-native/Libraries/Types/CodegenTypes';

type PayButtonPressedEvent = Readonly<{}>;
export type LayoutChangeEvent = {
  width: Int32;
  height: Int32;
};

export interface NativeProps extends ViewProps {
  paymentMethod: string;
  configuration: string;
  onButtonPress?: DirectEventHandler<PayButtonPressedEvent>;
  onLayoutChange?: DirectEventHandler<LayoutChangeEvent>;
}

export default codegenNativeComponent<NativeProps>('CardView');
