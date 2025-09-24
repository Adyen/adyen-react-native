#import "ADYPlatformPayView.h"
#import "RCTBridge.h"
#import <React/RCTUIManager.h>
#import <React/RCTViewManager.h>

@interface ADYPlatformPayViewManager : RCTViewManager
@end

@implementation ADYPlatformPayViewManager

RCT_EXPORT_MODULE(ADYPlatformPayView)

- (UIView *)view {
  return [[ADYPlatformPayView alloc] init];
}

RCT_EXPORT_VIEW_PROPERTY(radius, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(theme, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(type, NSNumber)

RCT_EXPORT_VIEW_PROPERTY(onButtonPress, RCTDirectEventBlock)

@end