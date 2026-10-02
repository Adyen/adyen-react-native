//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

#import "ADYAdyenComponentView.h"

#import <react/renderer/components/AdyenPaymentSpec/ComponentDescriptors.h>
#import <react/renderer/components/AdyenPaymentSpec/EventEmitters.h>
#import <react/renderer/components/AdyenPaymentSpec/Props.h>
#import <react/renderer/components/AdyenPaymentSpec/RCTComponentViewHelpers.h>

#import "RCTFabricComponentsPlugins.h"

#if __has_include(<adyen_react_native/adyen_react_native-Swift.h>)
#import <adyen_react_native/adyen_react_native-Swift.h>
#else
#import "adyen_react_native-Swift.h"
#endif

using namespace facebook::react;

@interface ADYAdyenComponentView () <RCTAdyenCheckoutComponentViewViewProtocol, AdyenComponentViewProxyDelegate>
@end

@implementation ADYAdyenComponentView {
  AdyenComponentViewProxy *_proxy;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<AdyenCheckoutComponentViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const AdyenCheckoutComponentViewProps>();
    _props = defaultProps;
    _proxy = [[AdyenComponentViewProxy alloc] initWithFrame:self.bounds];
    _proxy.delegate = self;
    _proxy.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    [self addSubview:_proxy];
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props
           oldProps:(Props::Shared const &)oldProps {
  const auto &newViewProps = *std::static_pointer_cast<AdyenCheckoutComponentViewProps const>(props);

  const auto targetKindString = toString(newViewProps.targetKind);
  NSString *checkoutID = [NSString stringWithUTF8String:newViewProps.checkoutId.c_str()];
  NSString *presenterID = [NSString stringWithUTF8String:newViewProps.presenterId.c_str()];
  NSString *targetKind = [NSString stringWithUTF8String:targetKindString.c_str()];
  NSString *targetValue = [NSString stringWithUTF8String:newViewProps.targetValue.c_str()];
  [_proxy updateRegistrationWithCheckoutID:checkoutID
                               presenterID:presenterID
                                targetKind:targetKind
                               targetValue:targetValue];

  [super updateProps:props oldProps:oldProps];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  [_proxy dispose];
}

#pragma mark - AdyenComponentViewProxyDelegate

- (void)onLayoutChangeWithWidth:(CGFloat)width height:(CGFloat)height {
  if (_eventEmitter) {
    AdyenCheckoutComponentViewEventEmitter::OnLayoutChange result = {
      .width = static_cast<int>(width),
      .height = static_cast<int>(height)
    };
    self.eventEmitter.onLayoutChange(result);
  }
}

- (const AdyenCheckoutComponentViewEventEmitter &)eventEmitter {
  return static_cast<const AdyenCheckoutComponentViewEventEmitter &>(*_eventEmitter);
}

@end

Class<RCTComponentViewProtocol> AdyenComponentViewCls(void) {
  return ADYAdyenComponentView.class;
}
