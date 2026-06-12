import type { CodegenTypes, ViewProps } from 'react-native';
import { codegenNativeComponent } from 'react-native';

export type LayoutChangeEvent = {
  width: CodegenTypes.Int32;
  height: CodegenTypes.Int32;
};

export interface NativeProps extends ViewProps {
  paymentMethod: string;
  configuration: string;
  onLayoutChange?: CodegenTypes.DirectEventHandler<LayoutChangeEvent>;
}

export default codegenNativeComponent<NativeProps>('CardView');
