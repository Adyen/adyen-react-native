//
//  ADYAppearanceConfiguration.h
//  Adyen3DS2
//
//  Copyright © 2018 Adyen. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <Adyen3DS2/ADYNavigationBarAppearance.h>
#import <Adyen3DS2/ADYLabelAppearance.h>
#import <Adyen3DS2/ADYTextFieldAppearance.h>
#import <Adyen3DS2/ADYSelectAppearance.h>
#import <Adyen3DS2/ADYButtonAppearance.h>
#import <Adyen3DS2/ADYInfoAppearance.h>
#import <Adyen3DS2/ADYSwitchAppearance.h>

NS_ASSUME_NONNULL_BEGIN

/**
 An enum describing the different button types.
 */
typedef NS_ENUM(NSUInteger, ADYAppearanceButtonType) {
    
    /// Indicates the submit button.
    ADYAppearanceButtonTypeSubmit,
    
    /// Indicates the continue button.
    ADYAppearanceButtonTypeContinue,
    
    /// Indicates the next button.
    ADYAppearanceButtonTypeNext,
    
    /// Indicates the cancel button.
    ADYAppearanceButtonTypeCancel,
    
    /// Indicates the resend button.
    ADYAppearanceButtonTypeResend
    
};

/**
 Provides appearance customization properties for interface elements used throughout the challenge flow.
 
 @note This class corresponds to the `UiCustomization` class in the specification.
 */
@interface ADYAppearanceConfiguration : NSObject <NSCopying>

/**
 The preferred status bar style for the challenge flow.
 */
@property (nonatomic, assign, readwrite) UIStatusBarStyle statusBarStyle;

/**
 The background color of the entire challenge flow.
 */
@property (nonatomic, strong, readwrite) UIColor *backgroundColor;

/**
 A convenience property that sets the text color on every appearance object.
 */
@property (nonatomic, strong, readwrite) UIColor *textColor;

/**
 A convenience property that sets the border color on every appearance object.
 */
@property (nonatomic, strong, readwrite) UIColor *borderColor;

/**
 A convenience property that sets the tint color on every appearance object.
 */
@property (nonatomic, strong, readwrite) UIColor *tintColor;

/**
 The appearance of the navigation bar.
 */
@property (nonatomic, strong, readonly) ADYNavigationBarAppearance *navigationBarAppearance;

/**
 The appearance of the labels.
 */
@property (nonatomic, strong, readonly) ADYLabelAppearance *labelAppearance;

/**
 The appearance of the text fields.
 */
@property (nonatomic, strong, readonly) ADYTextFieldAppearance *textFieldAppearance;

/**
 The appearance of select controls.
 */
@property (nonatomic, strong, readonly) ADYSelectAppearance *selectAppearance;

/**
 The appearance of a switch item view.
 */
@property (nonatomic, strong, readonly) ADYSwitchAppearance *switchAppearance;
/**
 The appearance of info items.
 */
@property (nonatomic, strong, readonly) ADYInfoAppearance *infoAppearance;

/**
 Indicates the Challenge Screen modal presentation style.
 */
@property (nonatomic, assign, readwrite) UIModalPresentationStyle modalPresentationStyle;

/**
 Returns the appearance for the button of the given type.

 @param buttonType The button type to return the appearance for.
 @return The appearance for the button of the given type.
 */
- (ADYButtonAppearance *)buttonAppearanceForButtonType:(ADYAppearanceButtonType)buttonType;

@end

NS_ASSUME_NONNULL_END
