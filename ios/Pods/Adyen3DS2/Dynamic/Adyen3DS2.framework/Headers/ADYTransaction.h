//
//  ADYTransaction.h
//  Adyen3DS2
//
//  Copyright © 2018 Adyen. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <Adyen3DS2/ADYAuthenticationRequestParameters.h>
#import <Adyen3DS2/ADYChallengeParameters.h>
#import <Adyen3DS2/ADYChallengeDelegate.h>
#import <Adyen3DS2/ADYProgressView.h>

/**
 The default timeout of a challenge.
 */
extern const NSTimeInterval ADYTransactionDefaultChallengeTimeout;

/**
 A block that is invoked when a challenge flow is completed.

 @param result The result of the challenge flow, in case it was completed successfully.
 @param error The error that occurred, in case the challenge flow failed.
 */
typedef void (^ADYChallengeCompletionHandler)(ADYChallengeResult * _Nullable result, NSError * _Nullable error);

NS_ASSUME_NONNULL_BEGIN

/**
 Represents a transaction that is to be authenticated using 3D-Secure 2.0.
 
 @note This class corresponds to the `Transaction` interface in the specification.
 */
@interface ADYTransaction : NSObject

/**
 The parameters provided by the SDK that should be sent with an authentication request.
 */
@property (nonatomic, strong, readonly) ADYAuthenticationRequestParameters *authenticationRequestParameters;

/**
 A progress view that can optionally be shown to indicate a loading state.
 */
@property (nonatomic, strong, readonly) id<ADYProgressView> progressView;

+ (instancetype)new NS_UNAVAILABLE;
- (instancetype)init NS_UNAVAILABLE;

/**
 Starts the challenge flow for the transaction.
 
 @param challengeParameters The challenge parameters received from the 3DS Server.
 @param delegate The delegate to inform of the result of the challenge.
 */
- (void)performChallengeWithParameters:(ADYChallengeParameters *)challengeParameters delegate:(id<ADYChallengeDelegate>)delegate;

/**
 Starts the challenge flow for the transaction.

 @param challengeParameters The challenge parameters received from the 3DS Server.
 @param delegate The delegate to inform of the result of the challenge.
 @param timeout The timeout interval in seconds in which the challenge process should be completed. Should be at least 300 seconds.
 */
- (void)performChallengeWithParameters:(ADYChallengeParameters *)challengeParameters delegate:(id<ADYChallengeDelegate>)delegate timeout:(NSTimeInterval)timeout;

/**
 Starts the challenge flow for the transaction.
 
 @param challengeParameters The challenge parameters received from the 3DS server.
 @param completionHandler The completion handler to invoke when the challenge flow is finished.
 */
- (void)performChallengeWithParameters:(ADYChallengeParameters *)challengeParameters completionHandler:(ADYChallengeCompletionHandler)completionHandler;

/**
 Starts the challenge flow for the transaction.

 @param challengeParameters The challenge parameters received from the 3DS server.
 @param timeout The timeout interval in seconds in which the challenge process should be completed. Should be at least 300 seconds. There is no maximum value.
 @param completionHandler The completion handler to invoke when the challenge flow is finished.
 */
- (void)performChallengeWithParameters:(ADYChallengeParameters *)challengeParameters timeout:(NSTimeInterval)timeout completionHandler:(ADYChallengeCompletionHandler)completionHandler;

/**
 Cancels the current challenge flow.
 */
- (void)cancelChallenge;

/**
 Closes the transaction, cleaning resources held by the transaction.
 
 This method should be called when no challenge is performed. When a challenge is performed, all sensitive data is removed automatically.
 */
- (void)close;

@end

NS_ASSUME_NONNULL_END
