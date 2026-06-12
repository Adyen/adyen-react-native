import type { CodegenTypes, ViewProps } from 'react-native';
import { codegenNativeComponent } from 'react-native';

type PayButtonPressedEvent = Readonly<{}>;

export interface NativeProps extends ViewProps {
  theme?: CodegenTypes.Int32;
  type?: CodegenTypes.Int32;
  radius?: CodegenTypes.Int32;
  onButtonPress?: CodegenTypes.DirectEventHandler<PayButtonPressedEvent>;
}

export default codegenNativeComponent<NativeProps>('PlatformPayView');
