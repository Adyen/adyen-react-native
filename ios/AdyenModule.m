//
// Copyright (c) 2021 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//


#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(AdyenDropIn, NSObject)

RCT_EXTERN_METHOD(open:(NSDictionary *)paymentMethods
                  configuration:(NSDictionary *)configuration)

RCT_EXTERN_METHOD(hide:(nonnull NSNumber *)success
                  event:(NSDictionary *)event)

RCT_EXTERN_METHOD(handle:(NSDictionary *)action)

@end

@interface RCT_EXTERN_MODULE(AdyenCardComponent, NSObject)

RCT_EXTERN_METHOD(open:(NSDictionary *)paymentMethods
                  configuration:(NSDictionary *)configuration)

RCT_EXTERN_METHOD(hide:(nonnull NSNumber *)success
                  event:(NSDictionary *)event)

RCT_EXTERN_METHOD(handle:(NSDictionary *)action)

@end

@interface RCT_EXTERN_MODULE(AdyenInstant, NSObject)

RCT_EXTERN_METHOD(open:(NSDictionary *)paymentMethods
                  configuration:(NSDictionary *)configuration)

RCT_EXTERN_METHOD(hide:(nonnull NSNumber *)success
                  event:(NSDictionary *)event)

RCT_EXTERN_METHOD(handle:(NSDictionary *)action)

@end
