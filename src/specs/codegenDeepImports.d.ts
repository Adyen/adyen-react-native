//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

// The specs keep the deep `react-native/Libraries/*` imports because codegen in
// RN 0.76-0.79 only understands unqualified codegen type names. Since RN 0.87
// (Strict TypeScript API) those paths ship no types, so they are typed here
// from the public `react-native` API.

declare module 'react-native/Libraries/Utilities/codegenNativeComponent' {
  import type { codegenNativeComponent, HostComponent } from 'react-native';

  type NativeComponentOptions = Parameters<typeof codegenNativeComponent>[1];

  export default function codegenNativeComponentDefault<Props extends {}>(
    componentName: string,
    options?: NativeComponentOptions
  ): HostComponent<Props>;
}

declare module 'react-native/Libraries/Types/CodegenTypes' {
  import type { CodegenTypes } from 'react-native';

  export type Int32 = CodegenTypes.Int32;
  export type DirectEventHandler<T> = CodegenTypes.DirectEventHandler<T>;
}
