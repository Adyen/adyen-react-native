#import "ADYCardView.h"

#import <react/renderer/components/AdyenPaymentSpec/ComponentDescriptors.h>
#import <react/renderer/components/AdyenPaymentSpec/EventEmitters.h>
#import <react/renderer/components/AdyenPaymentSpec/Props.h>
#import <react/renderer/components/AdyenPaymentSpec/RCTComponentViewHelpers.h>

#import "RCTFabricComponentsPlugins.h"

#import <PassKit/PassKit.h>

using namespace facebook::react;

@interface ADYCardView () <RCTCardViewViewProtocol>

@end

@implementation ADYCardView {
  PKPaymentButton *_button;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<CardViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const CardViewProps>();
    _props = defaultProps;

    const auto &viewProps =
        *std::static_pointer_cast<CardViewProps const>(_props);
    [self createButton:viewProps];
  }

  return self;
}

- (void)updateProps:(Props::Shared const &)props
           oldProps:(Props::Shared const &)oldProps {
  const auto &oldViewProps =
      *std::static_pointer_cast<CardViewProps const>(_props);
  const auto &newViewProps =
      *std::static_pointer_cast<CardViewProps const>(props);

  if (oldViewProps.showButton != newViewProps.showButton) {
    [self createButton:newViewProps];
  }

  [super updateProps:props oldProps:oldProps];
}

- (void)createButton:(const CardViewProps &)props {
  if (_button) {
    [_button removeFromSuperview];
  }

  [_button addTarget:self
                action:@selector(onPress)
      forControlEvents:UIControlEventTouchUpInside];
  self.contentView = _button;
}

- (void)onPress {
  CardViewEventEmitter::OnButtonPress result =
      CardViewEventEmitter::OnButtonPress{};
  self.eventEmitter.onButtonPress(result);
}

// Event emitter convenience method
- (const CardViewEventEmitter &)eventEmitter {
  return static_cast<const CardViewEventEmitter &>(*_eventEmitter);
}

Class<RCTComponentViewProtocol> ADYCardViewCls(void) {
  return ADYCardView.class;
}

@end
