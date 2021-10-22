//
//  ADYInfoAppearance.h
//  Adyen3DS2
//
//  Copyright © 2018 Adyen. All rights reserved.
//

#import <Adyen3DS2/ADYAppearance.h>

NS_ASSUME_NONNULL_BEGIN

/**
 Contains properties to customize the appearance of info items.
 */
@interface ADYInfoAppearance : ADYAppearance

/**
 The font in which heading text is displayed.
 */
@property (nonatomic, strong, readwrite) UIFont *headingFont;

/**
 The color in which heading text is displayed.
 */
@property (nonatomic, strong, readwrite) UIColor *headingTextColor;

/**
 The tint color of the item's selection indicator (the chevron).
 */
@property (nonatomic, strong, readwrite) UIColor *selectionIndicatorTintColor;

/**
 The color of the info item's border.
 */
@property (nonatomic, strong, readwrite) UIColor *borderColor;

@end

NS_ASSUME_NONNULL_END
