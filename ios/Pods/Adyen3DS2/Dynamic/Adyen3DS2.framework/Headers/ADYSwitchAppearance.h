//
//  ADYSwitchAppearance.h
//  Adyen3DS2
//
//  Copyright © 2019 Adyen. All rights reserved.
//

#import <Adyen3DS2/ADYAppearance.h>

NS_ASSUME_NONNULL_BEGIN

@interface ADYSwitchAppearance : ADYAppearance <NSCopying>

/**
 The tint color of the switch.
 */
@property (nonatomic, strong, readwrite) UIColor *switchTintColor;

@end

NS_ASSUME_NONNULL_END
