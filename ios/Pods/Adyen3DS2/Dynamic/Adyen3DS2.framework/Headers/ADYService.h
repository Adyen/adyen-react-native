//
//  ADYService.h
//  Adyen3DS2
//
//  Copyright © 2018 Adyen. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <Adyen3DS2/ADYServiceParameters.h>
#import <Adyen3DS2/ADYAppearanceConfiguration.h>
#import <Adyen3DS2/ADYTransaction.h>
#import <Adyen3DS2/ADYWarning.h>

NS_ASSUME_NONNULL_BEGIN

/**
 Provides a starting point for 3D-Secure 2.0 authentication. Used for initialization of the service and the creation of a transaction.
 
 @note This class corresponds to the `Three3DS2Service` interface in the specification.
 */
@interface ADYService : NSObject

/**
 The current version of the SDK.
 */
@property (class, nonatomic, copy, readonly) NSString *version;

/**
 Array containing the warnings that were produced during initialization of the service.
 */
@property (nonatomic, copy, readonly) NSArray<ADYWarning *> *warnings;

/**
 Asynchronously creates a service and prepares it for creating a transaction.

 @param parameters A collection of parameters to use during initialization of the service.
 @param appearanceConfiguration The configuration of the appearance of the challenge flow. When `nil`, a default appearance configuration is used.
 @param completionHandler The completion handler to invoke when the service has been initialized.
 */
+ (void)serviceWithParameters:(ADYServiceParameters *)parameters appearanceConfiguration:(nullable ADYAppearanceConfiguration *)appearanceConfiguration completionHandler:(void (^)(ADYService *service))completionHandler;

/**
 Creates a new transaction.
 
 @param messageVersion The version of the protocol to be used during the transaction, or `nil` to use the latest supported version.
 @param error A pointer to an error object that is set to an @p NSError instance when an error occurs.
 @return An initialized transaction, or @p nil if a transaction could not be initialized.
 */
- (nullable ADYTransaction *)transactionWithMessageVersion:(nullable NSString *)messageVersion error:(NSError *__nullable *__nullable)error;

#pragma mark -
#pragma mark Deprecated

/**
 A boolean value indicating whether the service is ready to create transactions.
 */
@property (nonatomic, assign, readonly, getter=isReady) BOOL ready DEPRECATED_MSG_ATTRIBUTE("Use +serviceWithParameters:appearanceConfiguration:completionHandler: to create a service.");

/**
 Asynchronously loads a service and creates a transaction. This method acts as a helper method that consolidates the two ADYService methods into one.
 
 @param parameters The parameters to use when loading the service.
 @param appearanceConfiguration The configuration of the appearance of the challenge flow. When `nil`, a default appearance configuration is used.
 @param completionHandler The completion handler to invoke when the service has been loaded. When the transaction creation failed, the an error is given and the transaction and warnings parameters are `nil`.
 */
+ (void)transactionWithParameters:(ADYServiceParameters *)parameters appearanceConfiguration:(nullable ADYAppearanceConfiguration *)appearanceConfiguration completionHandler:(void (^)(ADYTransaction * _Nullable transaction, NSArray<ADYWarning *> * _Nullable warnings, NSError * _Nullable error))completionHandler DEPRECATED_MSG_ATTRIBUTE("Use +serviceWithParameters:appearanceConfiguration:completionHandler: and -transactionWithMessageVersion:error: to create a service.");

/**
 Asynchronously loads the service and prepares it for creating a transaction.
 
 @param parameters A collection of parameters to use when loading the service.
 @param appearanceConfiguration The configuration of the appearance of the challenge flow. When `nil`, a default appearance configuration is used.
 @param completionHandler The completion handler to invoke when the service has been loaded.
 */
- (void)loadWithParameters:(nullable ADYServiceParameters *)parameters appearanceConfiguration:(nullable ADYAppearanceConfiguration *)appearanceConfiguration completionHandler:(void(^)(void))completionHandler DEPRECATED_MSG_ATTRIBUTE("Use +serviceWithParameters:appearanceConfiguration:completionHandler: to create a service.");

/**
 Creates a new transaction.
 
 @param directoryServerIdentifier The identifier of the directory server for which to create the transaction. When `nil`, the directory server information is assumed to have been passed in the parameters during initialization of the service.
 @param messageVersion The version of the protocol to be used during the transaction, or `nil` to use the latest supported version.
 @param error A pointer to an error object that is set to an @p NSError instance when an error occurs.
 @return An initialized transaction, or @p nil if a transaction could not be initialized.
 */
- (nullable ADYTransaction *)transactionWithDirectoryServerIdentifier:(nullable NSString *)directoryServerIdentifier messageVersion:(nullable NSString *)messageVersion error:(NSError *__nullable *__nullable)error DEPRECATED_MSG_ATTRIBUTE("Use -transactionWithMessageVersion:error: to create a transaction.");

@end

NS_ASSUME_NONNULL_END
