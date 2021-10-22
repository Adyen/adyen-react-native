//
//  ADYTextFieldAppearance.h
//  Adyen3DS2
//
//  Copyright © 2018 Adyen. All rights reserved.
//

#import <Adyen3DS2/ADYAppearance.h>

NS_ASSUME_NONNULL_BEGIN

/**
 Contains properties to customize the appearance of the text fields.
 
 @note This class corresponds to the `TextFieldCustomization` class in the specification.
 */
@interface ADYTextFieldAppearance : ADYAppearance

/**
 The width of the text field's border.
 */
@property (nonatomic, assign, readwrite) CGFloat borderWidth;

/**
 The color of the text field's border.
 */
@property (nonatomic, strong, readwrite) UIColor *borderColor;

/**
 The radius of the text field's corners.
 */
@property (nonatomic, assign, readwrite) CGFloat cornerRadius;

/**
 The appearance of the keyboard when the text field is used.
 */
@property (nonatomic, assign, readwrite) UIKeyboardAppearance keyboardAppearance;

@end

NS_ASSUME_NONNULL_END
