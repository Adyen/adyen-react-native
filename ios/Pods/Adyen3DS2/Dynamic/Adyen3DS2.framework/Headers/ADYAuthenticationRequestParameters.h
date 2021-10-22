//
//  ADYAuthenticationRequestParameters.h
//  Adyen3DS2
//
//  Copyright © 2018 Adyen. All rights reserved.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/**
 Contains data that should be sent to the 3DS Server in an authentication request (AReq).
 
 @note This class corresponds to the `AuthenticationRequestParameters` class in the specification.
 */
@interface ADYAuthenticationRequestParameters : NSObject <NSCoding, NSSecureCoding>

/**
 The device information, encrypted using JSON Web Encryption.
 */
@property (nonatomic, copy, readonly) NSString *deviceInformation;

/**
 A unique string identifying the application.
 */
@property (nonatomic, copy, readonly) NSString *SDKApplicationIdentifier;

/**
 A unique string identifying the transaction within the scope of the SDK.
 */
@property (nonatomic, copy, readonly) NSString *SDKTransactionIdentifier;

/**
 A string identifying the SDK, assigned by EMVCo.
 */
@property (nonatomic, copy, readonly) NSString *SDKReferenceNumber;

/**
 The public key component of the ephemeral keypair generated for the transaction, represented as a JWK.
 */
@property (nonatomic, copy, readonly) NSString *SDKEphemeralPublicKey;

/**
 The protocol version to use during the transaction.
 */
@property (nonatomic, copy, readonly) NSString *messageVersion;

+ (instancetype)new NS_UNAVAILABLE;
- (instancetype)init NS_UNAVAILABLE;

@end

NS_ASSUME_NONNULL_END
