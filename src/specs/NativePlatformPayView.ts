import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import type { ViewProps } from 'react-native';
import type {
  DirectEventHandler,
  Int32,
} from 'react-native/Libraries/Types/CodegenTypes';

type PayButtonPressedEvent = Readonly<{}>;

export interface NativeProps extends ViewProps {
  theme?: Int32;
  type?: Int32;
  radius?: Int32;
  onButtonPress?: DirectEventHandler<PayButtonPressedEvent>;
}

export default codegenNativeComponent<NativeProps>('PlatformPayView');
