//
//  ADYSelectAppearance.h
//  Adyen3DS2
//
//  Copyright © 2018 Adyen. All rights reserved.
//

#import <Adyen3DS2/ADYAppearance.h>

NS_ASSUME_NONNULL_BEGIN

/**
 Contains properties to customize the appearance of select controls.
 */
@interface ADYSelectAppearance : ADYAppearance

/**
 The color of the select control's borders.
 */
@property (nonatomic, strong, readwrite) UIColor *borderColor;

/**
 The color of a select control item's background when it's highlighted.
 */
@property (nonatomic, strong, readwrite) UIColor *highlightedBackgroundColor;

/**
 The tint color of the select control item's selection indicator.
 */
@property (nonatomic, strong, readwrite) UIColor *selectionIndicatorTintColor;

@end

NS_ASSUME_NONNULL_END
