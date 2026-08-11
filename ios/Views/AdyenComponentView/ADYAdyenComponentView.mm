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

@interface ADYAdyenComponentView () <RCTAdyenComponentViewViewProtocol, AdyenComponentViewProxyDelegate>
@end

@implementation ADYAdyenComponentView {
  AdyenComponentViewProxy *_proxy;
  NSString *_type;
  NSString *_configuration;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<AdyenComponentViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const AdyenComponentViewProps>();
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
  const auto &newViewProps = *std::static_pointer_cast<AdyenComponentViewProps const>(props);

  _proxy.viewId = [NSString stringWithFormat:@"%ld", (long)self.tag];

  NSString *newType = [NSString stringWithUTF8String:newViewProps.type.c_str()];
  NSString *newConfiguration = [NSString stringWithUTF8String:newViewProps.configuration.c_str()];

  if (![_type isEqualToString:newType]) {
    _type = newType;
    [_proxy setType:_type];
  }

  if (![_configuration isEqualToString:newConfiguration]) {
    _configuration = newConfiguration;
    [_proxy setConfiguration:_configuration];
  }

  [super updateProps:props oldProps:oldProps];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  [_proxy dispose];
  _type = nil;
  _configuration = nil;
}

#pragma mark - AdyenComponentViewProxyDelegate

- (void)onLayoutChangeWithWidth:(CGFloat)width height:(CGFloat)height {
  if (_eventEmitter) {
    AdyenComponentViewEventEmitter::OnLayoutChange result = {
      .width = static_cast<int>(width),
      .height = static_cast<int>(height)
    };
    self.eventEmitter.onLayoutChange(result);
  }
}

- (const AdyenComponentViewEventEmitter &)eventEmitter {
  return static_cast<const AdyenComponentViewEventEmitter &>(*_eventEmitter);
}

@end

Class<RCTComponentViewProtocol> AdyenComponentViewCls(void) {
  return ADYAdyenComponentView.class;
}
