#import "ADYPlatformPayView.h"

#import <react/renderer/components/AdyenPaymentSpec/ComponentDescriptors.h>
#import <react/renderer/components/AdyenPaymentSpec/EventEmitters.h>
#import <react/renderer/components/AdyenPaymentSpec/Props.h>
#import <react/renderer/components/AdyenPaymentSpec/RCTComponentViewHelpers.h>

#import "RCTFabricComponentsPlugins.h"

#import <PassKit/PassKit.h>

using namespace facebook::react;

static PKPaymentButtonType paymentButtonTypeFromProps(const int &type) {
  switch (type) {
    case 1: return PKPaymentButtonTypeBuy;
    case 2: return PKPaymentButtonTypeSetUp;
    case 3: return PKPaymentButtonTypeInStore;
    case 4: return PKPaymentButtonTypeDonate;
    case 5: return PKPaymentButtonTypeCheckout;
    case 6: return PKPaymentButtonTypeBook;
    case 7: return PKPaymentButtonTypeSubscribe;
    case 8: return PKPaymentButtonTypeReload;
    case 9: return PKPaymentButtonTypeAddMoney;
    case 10: return PKPaymentButtonTypeTopUp;
    case 11: return PKPaymentButtonTypeOrder;
    case 12: return PKPaymentButtonTypeRent;
    case 13: return PKPaymentButtonTypeSupport;
    case 14: return PKPaymentButtonTypeContribute;
    case 15: return PKPaymentButtonTypeTip;
    case 16: return PKPaymentButtonTypeContinue;
    default: return PKPaymentButtonTypePlain;
  }
}

static PKPaymentButtonStyle paymentButtonStyleFromProps(const int &style) {
  switch (style) {
    case 1: return PKPaymentButtonStyleWhite;
    case 2: return PKPaymentButtonStyleWhiteOutline;
    case 3: {
      if (@available(iOS 14.0, *)) {
        return PKPaymentButtonStyleAutomatic;
      } else {
        return PKPaymentButtonStyleBlack;
      }
    }
    default: return PKPaymentButtonStyleBlack;
  }
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
      oldViewProps.theme != newViewProps.theme ||
      oldViewProps.radius != newViewProps.radius) {
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
  _button.cornerRadius = props.radius;
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
