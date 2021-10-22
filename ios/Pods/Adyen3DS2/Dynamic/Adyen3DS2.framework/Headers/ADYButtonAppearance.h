//
//  ADYButtonAppearance.h
//  Adyen3DS2
//
//  Copyright © 2018 Adyen. All rights reserved.
//

#import <Adyen3DS2/ADYAppearance.h>

NS_ASSUME_NONNULL_BEGIN

/**
 The type of transform to apply to the button's text.
 */
typedef NS_ENUM(NSUInteger, ADYButtonAppearanceTextTransform) {
    
    /// Indicates the text should not be transformed.
    ADYButtonAppearanceTextTransformNone,
    
    /// Indicates the text should be uppercased.
    ADYButtonAppearanceTextTransformUppercase,
    
    /// Indicates the text should be lowercased.
    ADYButtonAppearanceTextTransformLowercase
    
};

/**
 Contains properties to customize the appearance of a button.
 
 @note This class corresponds to the `ButtonCustomization` class in the specification.
 */
@interface ADYButtonAppearance : ADYAppearance

/**
 The type of transform to apply to the button's text.
 */
@property (nonatomic, assign, readwrite) ADYButtonAppearanceTextTransform textTransform;

/**
 The background color of the button.
 */
@property (nonatomic, strong, readwrite) UIColor *backgroundColor;

/**
 The color of the button's title in case it's disabled.
 */
@property (nonatomic, strong, readwrite) UIColor *disabledTextColor;

/**
 The background color of the button in case it's disabled.
 */
@property (nonatomic, strong, readwrite) UIColor *disabledBackgroundColor;

/**
 The background color of hte button in case it's highlighted, or nil when the default color should be darkened.
 */
@property (nonatomic, strong, readwrite, nullable) UIColor *highlightedBackgroundColor;

/**
 The radius of the button's corners.
 */
@property (nonatomic, assign, readwrite) CGFloat cornerRadius;

@end

NS_ASSUME_NONNULL_END
