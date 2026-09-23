//
// Copyright (c) 2021 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//


#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(AdyenDropIn, NSObject)

RCT_EXTERN_METHOD(start:(nonnull NSDictionary *)paymentMethods)

RCT_EXTERN_METHOD(action:(nonnull NSDictionary *)actionJson)

RCT_EXTERN_METHOD(completion:(nonnull NSString *)resultCode)

RCT_EXTERN_METHOD(retry:(nonnull NSString *)message)

RCT_EXTERN_METHOD(getReturnURL:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(update:(nullable NSArray *)results)

RCT_EXTERN_METHOD(confirm:(nonnull NSNumber *)success
                  address:(nullable NSDictionary *)address)

@end

@interface RCT_EXTERN_MODULE(AdyenComponent, NSObject)

RCT_EXTERN_METHOD(subscribe:(nonnull NSString *)viewId)

RCT_EXTERN_METHOD(unsubscribe:(nonnull NSString *)viewId)

RCT_EXTERN_METHOD(action:(nonnull NSString *)viewId
                  actionDict:(nullable NSDictionary *)actionDict)

RCT_EXTERN_METHOD(completion:(nonnull NSString *)viewId
                  resultCode:(nonnull NSString *)resultCode)

RCT_EXTERN_METHOD(retry:(nonnull NSString *)viewId
                  message:(nullable NSString *)message)

RCT_EXTERN_METHOD(update:(nonnull NSString *)viewId
                  results:(nullable NSArray *)results)

RCT_EXTERN_METHOD(confirm:(nonnull NSString *)viewId
                  success:(nonnull NSNumber *)success
                  address:(nullable NSDictionary *)address)

@end


