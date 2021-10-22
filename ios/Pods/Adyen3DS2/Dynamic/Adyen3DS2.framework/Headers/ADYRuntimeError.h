//
//  ADYRuntimeError.h
//  Adyen3DS2
//
//  Copyright © 2018 Adyen. All rights reserved.
//

#import <Foundation/Foundation.h>

/**
 The error domain for errors that occurred locally.
 */
extern NSString *const ADYRuntimeErrorDomain;

/**
 The error codes for errors with the ADYRuntimeErrorDomain domain.
 */
typedef NS_ENUM(NSUInteger, ADYRuntimeErrorCode) {
    
    /// Indicates a directory server with the given identifier could not be found.
    ADYRuntimeErrorUnknownDirectoryServer,
    
    /// Indicates the secure channel setup with the ACS has failed.
    ADYRuntimeErrorSecureChannelSetupFailed,
    
    /// Indicates an invalid response was received from the ACS.
    ADYRuntimeErrorInvalidResponse,
    
    /// Indicates a request to the ACS failed or timed out.
    ADYRuntimeErrorRequestFailed,
    
    /// Indicates the specified timeout for a challenge was reached.
    ADYRuntimeErrorChallengeTimedOut,
    
    /// Indicates the challenge was cancelled.
    ADYRuntimeErrorChallengeCancelled
    
};
