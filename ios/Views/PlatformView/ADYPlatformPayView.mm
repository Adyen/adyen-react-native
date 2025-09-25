#import "ADYPlatformPayView.h"

#import <react/renderer/components/AdyenPaymentSpec/ComponentDescriptors.h>
#import <react/renderer/components/AdyenPaymentSpec/EventEmitters.h>
#import <react/renderer/components/AdyenPaymentSpec/Props.h>
#import <react/renderer/components/AdyenPaymentSpec/RCTComponentViewHelpers.h>

#import "RCTFabricComponentsPlugins.h"

#import <PassKit/PassKit.h>

using namespace facebook::react;

static PKPaymentButtonType paymentButtonTypeFromProps(const int &type) {
  if (type == 1)
    return PKPaymentButtonTypeBuy;
  if (type == 2)
    return PKPaymentButtonTypeSetUp;
  if (type == 3)
    return PKPaymentButtonTypeInStore;
  if (type == 4)
    return PKPaymentButtonTypeDonate;
  if (type == 5)
    return PKPaymentButtonTypeCheckout;
  if (type == 6)
    return PKPaymentButtonTypeBook;
  if (type == 7)
    return PKPaymentButtonTypeSubscribe;
  if (type == 8)
    return PKPaymentButtonTypeReload;
  if (type == 9)
    return PKPaymentButtonTypeAddMoney;
  if (type == 10)
    return PKPaymentButtonTypeTopUp;
  if (type == 11)
    return PKPaymentButtonTypeOrder;
  if (type == 12)
    return PKPaymentButtonTypeRent;
  if (type == 13)
    return PKPaymentButtonTypeSupport;
  if (type == 14)
    return PKPaymentButtonTypeContribute;
  if (type == 15)
    return PKPaymentButtonTypeTip;
  if (type == 16)
    return PKPaymentButtonTypeContinue;
  return PKPaymentButtonTypePlain;
}

static PKPaymentButtonStyle paymentButtonStyleFromProps(const int &style) {
  if (style == 1)
    return PKPaymentButtonStyleWhite;
  if (style == 2)
    return PKPaymentButtonStyleWhiteOutline;
  if (style == 3) {
    if (@available(iOS 14.0, *)) {
      return PKPaymentButtonStyleAutomatic;
    } else {
      return PKPaymentButtonStyleBlack;
    }
  }
  return PKPaymentButtonStyleBlack;
}

@interface ADYPlatformPayView () <RCTPlatformPayViewViewProtocol>

@end

@implementation ADYPlatformPayView {
  PKPaymentButton *_button;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<
      PlatformPayViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps =
        std::make_shared<const PlatformPayViewProps>();
    _props = defaultProps;

    const auto &viewProps =
        *std::static_pointer_cast<PlatformPayViewProps const>(_props);
    [self createButton:viewProps];
  }

  return self;
}

- (void)updateProps:(Props::Shared const &)props
           oldProps:(Props::Shared const &)oldProps {
  const auto &oldViewProps =
      *std::static_pointer_cast<PlatformPayViewProps const>(_props);
  const auto &newViewProps =
      *std::static_pointer_cast<PlatformPayViewProps const>(props);

  if (oldViewProps.type != newViewProps.type ||
      oldViewProps.theme != newViewProps.theme) {
    [self createButton:newViewProps];
  }

  [super updateProps:props oldProps:oldProps];
}

- (void)createButton:(const PlatformPayViewProps &)props {
  if (_button) {
    [_button removeFromSuperview];
  }

  PKPaymentButtonType type = paymentButtonTypeFromProps(props.type);
  PKPaymentButtonStyle style = paymentButtonStyleFromProps(props.theme);

  _button = [PKPaymentButton buttonWithType:type style:style];
  [_button addTarget:self
                action:@selector(onPress)
      forControlEvents:UIControlEventTouchUpInside];
  self.contentView = _button;
}

- (void)onPress {
  PlatformPayViewEventEmitter::OnButtonPress result =
      PlatformPayViewEventEmitter::OnButtonPress{};
  self.eventEmitter.onButtonPress(result);
}

// Event emitter convenience method
- (const PlatformPayViewEventEmitter &)eventEmitter {
  return static_cast<const PlatformPayViewEventEmitter &>(*_eventEmitter);
}

Class<RCTComponentViewProtocol> ADYPlatformPayViewCls(void) {
  return ADYPlatformPayView.class;
}

@end
