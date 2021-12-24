//
// Copyright (c) 2021 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//


#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(AdyenDropIn, NSObject)

RCT_EXTERN_METHOD(openDropIn:(NSDictionary *)paymentMethods
                  configuration:(NSDictionary *)configuration)

RCT_EXTERN_METHOD(hideDropIn)

RCT_EXTERN_METHOD(setDidSubmit:(RCTResponseSenderBlock)didSubmitCallback)
RCT_EXTERN_METHOD(setDidProvide:(RCTResponseSenderBlock)didProvideCallback)
RCT_EXTERN_METHOD(setDidComplete:(RCTResponseSenderBlock)didCompleteCallback)
RCT_EXTERN_METHOD(setDidFail:(RCTResponseSenderBlock)didFailCallback)
//RCT_EXTERN_METHOD(setDidCancel:(RCTResponseSenderBlock)didCancelCallback)
//RCT_EXTERN_METHOD(setDidOpenExternalApplication:(RCTResponseSenderBlock)didOpenExternalApplicationCallback)

RCT_EXTERN_METHOD(handle:(NSDictionary *)action)

@end
