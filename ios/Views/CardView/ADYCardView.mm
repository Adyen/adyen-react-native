#import "ADYCardView.h"

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

@interface ADYCardView () <RCTCardViewViewProtocol, CardComponentViewProxyDelegate>

@end

@implementation ADYCardView {
  CardComponentViewProxy *_cardProxy;
  NSString *_paymentMethod;
  NSString *_configuration;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<CardViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const CardViewProps>();
    _props = defaultProps;

    _cardProxy = [[CardComponentViewProxy alloc] initWithFrame:self.bounds];
    _cardProxy.delegate = self;
    _cardProxy.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    [self addSubview:_cardProxy];
  }

  return self;
}

- (void)updateProps:(Props::Shared const &)props
           oldProps:(Props::Shared const &)oldProps {
  const auto &oldViewProps =
      *std::static_pointer_cast<CardViewProps const>(_props);
  const auto &newViewProps =
      *std::static_pointer_cast<CardViewProps const>(props);

  NSString *newPaymentMethod = [NSString stringWithUTF8String:newViewProps.paymentMethod.c_str()];
  NSString *newConfiguration = [NSString stringWithUTF8String:newViewProps.configuration.c_str()];

  if (![_paymentMethod isEqualToString:newPaymentMethod]) {
    _paymentMethod = newPaymentMethod;
    [_cardProxy setPaymentMethod:_paymentMethod];
  }

  if (![_configuration isEqualToString:newConfiguration]) {
    _configuration = newConfiguration;
    [_cardProxy setConfiguration:_configuration];
  }

  [super updateProps:props oldProps:oldProps];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  [_cardProxy dispose];
  _paymentMethod = nil;
  _configuration = nil;
}

#pragma mark - CardComponentViewProxyDelegate

- (void)onLayoutChangeWithWidth:(CGFloat)width height:(CGFloat)height {
  if (_eventEmitter) {
    CardViewEventEmitter::OnLayoutChange result = {
      .width = static_cast<int>(width),
      .height = static_cast<int>(height)
    };
    self.eventEmitter.onLayoutChange(result);
  }
}

- (void)onPress {
  if (_eventEmitter) {
    CardViewEventEmitter::OnButtonPress result =
        CardViewEventEmitter::OnButtonPress{};
    self.eventEmitter.onButtonPress(result);
  }
}

// Event emitter convenience method
- (const CardViewEventEmitter &)eventEmitter {
  return static_cast<const CardViewEventEmitter &>(*_eventEmitter);
}

Class<RCTComponentViewProtocol> ADYCardViewCls(void) {
  return ADYCardView.class;
}

@end
