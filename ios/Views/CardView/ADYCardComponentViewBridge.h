//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

#import <UIKit/UIKit.h>

#ifndef ADYCardComponentViewBridge_h
#define ADYCardComponentViewBridge_h

NS_ASSUME_NONNULL_BEGIN

typedef void (^ADYCardComponentLayoutHandler)(CGFloat width, CGFloat height);

/// Objective-C facade over the Swift `CardComponentViewProxy`.
///
/// Under Swift Package Manager the Swift module is only reachable through `@import`, which
/// Objective-C++ sources cannot use without `-fcxx-modules`. `ADYCardView.mm` therefore talks
/// to the Swift proxy through this plain Objective-C type.
@interface ADYCardComponentViewBridge : NSObject

@property (nonatomic, readonly) UIView *view;
@property (nonatomic, copy, nullable) ADYCardComponentLayoutHandler onLayoutChange;

- (instancetype)initWithFrame:(CGRect)frame NS_DESIGNATED_INITIALIZER;
- (instancetype)init NS_UNAVAILABLE;

- (void)setViewId:(nullable NSString *)viewId;
- (void)setPaymentMethod:(nullable NSString *)paymentMethodJSON;
- (void)setConfiguration:(nullable NSString *)configurationJSON;
- (void)dispose;

@end

NS_ASSUME_NONNULL_END

#endif /* ADYCardComponentViewBridge_h */
