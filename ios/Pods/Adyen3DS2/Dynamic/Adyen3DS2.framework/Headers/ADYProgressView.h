//
//  ADYProgressView.h
//  Adyen3DS2
//
//  Copyright © 2018 Adyen. All rights reserved.
//

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

/**
 A full screen progress view with a title, cancel button and loading indicator.
 */
@protocol ADYProgressView <NSObject>

/**
 A block that is invoked when the cancel button is selected.
 */
@property (nonatomic, copy, readwrite, nullable) void (^cancelButtonHandler)(void);

/**
 Shows the progress view on the current top-most view.
 */
- (void)show;

/**
 Hides the progress view.
 */
- (void)hide;

@end

NS_ASSUME_NONNULL_END
