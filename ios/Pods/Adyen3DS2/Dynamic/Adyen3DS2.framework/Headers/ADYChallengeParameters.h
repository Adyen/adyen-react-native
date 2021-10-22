//
//  ADYChallengeParameters.h
//  Adyen3DS2
//
//  Copyright © 2018 Adyen. All rights reserved.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/**
 Contains data returned by the 3DS Server in response to an authentication request (AReq).
 
 @note This class corresponds to the `ChallengeParameters` class in the specification.
 */
@interface ADYChallengeParameters : NSObject <NSCoding, NSSecureCoding>

/**
 A URL that is registered to open the 3DS Requestor App. It will be opened after an Out Of Band authentication has been completed.
 This property will be ignored if the message version is 2.1.0.
 */
@property (nonatomic, copy, readonly, nullable) NSURL *threeDSRequestorAppURL;

/**
 A unique string identifying the transaction within the scope of the 3DS Server.
 */
@property (nonatomic, copy, readonly) NSString *serverTransactionIdentifier;

/**
 A unique string identifying the transaction within the scope of the ACS.
 */
@property (nonatomic, copy, readonly) NSString *ACSTransactionIdentifier;

/**
 A string identifying the ACS, assigned by EMVCo.
 */
@property (nonatomic, copy, readonly) NSString *ACSReferenceNumber;

/**
 A JWS containing, among other data, the ACS Ephemeral Public Key.
 */
@property (nonatomic, copy, readonly) NSString *ACSSignedContent;

/**
 Creates and returns an object containing challenge parameters.

 @param serverTransactionIdentifier A unique string identifying the transaction within the scope of the 3DS Server.
 @param ACSTransactionIdentifier A unique string identifying the transaction within the scope of the ACS.
 @param ACSReferenceNumber A string identifying the ACS, assigned by EMVCo.
 @param ACSSignedContent Content signed using JWS, containing ACS Ephemeral Public Key, ACS URL and authentication type.
 @return Initialized object containing the challenge parameters.
 */
+ (instancetype)challengeParametersWithServerTransactionIdentifier:(NSString *)serverTransactionIdentifier
                                          ACSTransactionIdentifier:(NSString *)ACSTransactionIdentifier
                                                ACSReferenceNumber:(NSString *)ACSReferenceNumber
                                                  ACSSignedContent:(NSString *)ACSSignedContent;

/**
 Creates and returns an object containing challenge parameters.

 @param serverTransactionIdentifier A unique string identifying the transaction within the scope of the 3DS Server.
 @param threeDSRequestorAppURL The Merchant app URL. It will be ignored if the message version is 2.1.0.
 @param ACSTransactionIdentifier A unique string identifying the transaction within the scope of the ACS.
 @param ACSReferenceNumber A string identifying the ACS, assigned by EMVCo.
 @param ACSSignedContent Content signed using JWS, containing ACS Ephemeral Public Key, ACS URL and authentication type.
 @return Initialized object containing the challenge parameters.
 */
+ (instancetype)challengeParametersWithServerTransactionIdentifier:(NSString *)serverTransactionIdentifier
                                            threeDSRequestorAppURL:(nullable NSURL *)threeDSRequestorAppURL
                                          ACSTransactionIdentifier:(NSString *)ACSTransactionIdentifier
                                                ACSReferenceNumber:(NSString *)ACSReferenceNumber
                                                  ACSSignedContent:(NSString *)ACSSignedContent;

+ (instancetype)new NS_UNAVAILABLE;
- (instancetype)init NS_UNAVAILABLE;

@end

NS_ASSUME_NONNULL_END
