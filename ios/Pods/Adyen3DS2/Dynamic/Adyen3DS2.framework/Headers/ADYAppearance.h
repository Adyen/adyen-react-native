//
//  ADYAppearance.h
//  Adyen3DS2
//
//  Copyright © 2018 Adyen. All rights reserved.
//

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

/**
 Contains properties to customize the appearance of an interface element.
 
 @note This class corresponds to the `Customization` class in the specification.
 */
@interface ADYAppearance : NSObject <NSCopying>

/**
 The font in which text is displayed.
 */
@property (nonatomic, strong, readwrite) UIFont *font;

/**
 The color in which text is displayed.
 */
@property (nonatomic, strong, readwrite) UIColor *textColor;

@end

NS_ASSUME_NONNULL_END
