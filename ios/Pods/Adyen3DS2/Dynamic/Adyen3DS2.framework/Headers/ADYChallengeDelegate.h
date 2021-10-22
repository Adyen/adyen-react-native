//
//  ADYChallengeDelegate.h
//  Adyen3DS2
//
//  Copyright © 2018 Adyen. All rights reserved.
//

#import <Adyen3DS2/ADYChallengeResult.h>

NS_ASSUME_NONNULL_BEGIN

/**
 Defines methods which a delegate can implement to be informed when a challenge is completed.
 
 @note This protocol corresponds to the `ChallengeStatusReceiver` interface in the specification.
 */
@protocol ADYChallengeDelegate <NSObject>

/**
 Invoked when a challenge is completed successfully.

 @param result The result of the challenge.
 */
- (void)challengeDidFinishWithResult:(ADYChallengeResult *)result;

/**
 Invokes when a challenge has failed.

 @param error The error that occurred.
 */
- (void)challengeDidFailWithError:(NSError *)error;

@end

NS_ASSUME_NONNULL_END
