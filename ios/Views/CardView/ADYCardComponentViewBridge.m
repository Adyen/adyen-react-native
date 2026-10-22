//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

#import "ADYCardComponentViewBridge.h"

#if __has_include(<adyen_react_native/adyen_react_native-Swift.h>)
#import <adyen_react_native/adyen_react_native-Swift.h>
#elif __has_include("adyen_react_native-Swift.h")
#import "adyen_react_native-Swift.h"
#else
// Swift Package Manager exposes the Swift target's generated header only through its module map.
@import adyen_react_native;
#endif

@interface ADYCardComponentViewBridge () <CardComponentViewProxyDelegate>
@end

@implementation ADYCardComponentViewBridge {
  CardComponentViewProxy *_proxy;
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super init]) {
    _proxy = [[CardComponentViewProxy alloc] initWithFrame:frame];
    _proxy.delegate = self;
  }
  return self;
}

- (UIView *)view {
  return _proxy;
}

- (void)setViewId:(NSString *)viewId {
  _proxy.viewId = viewId;
}

- (void)setPaymentMethod:(NSString *)paymentMethodJSON {
  [_proxy setPaymentMethod:paymentMethodJSON];
}

- (void)setConfiguration:(NSString *)configurationJSON {
  [_proxy setConfiguration:configurationJSON];
}

- (void)dispose {
  [_proxy dispose];
}

#pragma mark - CardComponentViewProxyDelegate

- (void)onLayoutChangeWithWidth:(CGFloat)width height:(CGFloat)height {
  if (self.onLayoutChange) {
    self.onLayoutChange(width, height);
  }
}

@end
