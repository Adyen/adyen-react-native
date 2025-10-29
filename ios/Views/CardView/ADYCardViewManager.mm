#import "ADYCardView.h"
#import "RCTBridge.h"
#import <React/RCTUIManager.h>
#import <React/RCTViewManager.h>
#include <objc/objc.h>

@interface ADYCardViewManager : RCTViewManager
@end

@implementation ADYCardViewManager

RCT_EXPORT_MODULE(ADYCardView)

- (UIView *)view {
  return [[ADYCardView alloc] init];
}

RCT_EXPORT_VIEW_PROPERTY(showButton, BOOL)

RCT_EXPORT_VIEW_PROPERTY(onButtonPress, RCTDirectEventBlock)

@end