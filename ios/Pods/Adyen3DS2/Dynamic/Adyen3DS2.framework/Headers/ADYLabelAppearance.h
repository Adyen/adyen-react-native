//
//  ADYLabelAppearance.h
//  Adyen3DS2
//
//  Copyright © 2018 Adyen. All rights reserved.
//

#import <Adyen3DS2/ADYAppearance.h>

NS_ASSUME_NONNULL_BEGIN

/**
 Contains properties to customize the appearance of the labels.
 
 @note This class corresponds to the `LabelCustomization` class in the specification.
 */
@interface ADYLabelAppearance : ADYAppearance

/**
 The font in which heading text is displayed.
 */
@property (nonatomic, strong, readwrite) UIFont *headingFont;

/**
 The color in which heading text is displayed.
 */
@property (nonatomic, strong, readwrite) UIColor *headingTextColor;

/**
 The line height of the heading text.
 */
@property (nonatomic, assign, readwrite) CGFloat headingLineHeight;

/**
 The font in which subheading text is displayed.
 */
@property (nonatomic, strong, readwrite) UIFont *subheadingFont;

/**
 The color in which subheading text is displayed.
 */
@property (nonatomic, strong, readwrite) UIColor *subheadingTextColor;

/**
 The color in which error text is displayed.
 */
@property (nonatomic, strong, readwrite) UIColor *errorTextColor;

/**
 The line height of regular text.
 */
@property (nonatomic, assign, readwrite) CGFloat lineHeight;

@end

NS_ASSUME_NONNULL_END
