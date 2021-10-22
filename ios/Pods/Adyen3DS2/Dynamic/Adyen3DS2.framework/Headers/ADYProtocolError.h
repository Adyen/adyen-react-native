//
//  ADYProtocolError.h
//  Adyen3DS2
//
//  Copyright © 2018 Adyen. All rights reserved.
//

#import <Foundation/Foundation.h>

/**
 The error domain for errors that occurred during communication with the ACS.
 */
extern NSString *const ADYProtocolErrorDomain;

/**
 The key in the user info dictionary of an NSError that provides additional details to identify the error that occurred.
 */
extern NSString *const ADYProtocolErrorDetailKey;

/**
 The key in the user info dictionary of an NSError that provides the SDK transaction identifier for protocol errors.
 */
extern NSString *const ADYProtocolErrorSDKTransactionIdentifierKey;

/**
 The key in the user info dictionary of an NSError that provides the 3DS Server transaction identifier for protocol errors.
 */
extern NSString *const ADYProtocolErrorServerTransactionIdentifierKey;

/**
 The key in the user info dictionary of an NSError that provides the ACS transaction identifier for protocol errors.
 */
extern NSString *const ADYProtocolErrorACSTransactionIdentifierKey;
