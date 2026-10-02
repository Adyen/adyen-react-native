//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <ReactCommon/RCTTurboModule.h>

#import "AdyenPaymentSpec.h"

@interface CheckoutTurboModuleAdapter : NSObject
- (void)setSdkVersion:(NSString *)sdkVersion;
- (void)setEventSink:(void (^)(NSDictionary *event))sink;
- (void)setupSession:(NSDictionary *)session
    configuration:(NSDictionary *)configuration
         resolver:(RCTPromiseResolveBlock)resolve
         rejecter:(RCTPromiseRejectBlock)reject;
- (void)setupAdvanced:(NSDictionary *)paymentMethods
        configuration:(NSDictionary *)configuration
             resolver:(RCTPromiseResolveBlock)resolve
             rejecter:(RCTPromiseRejectBlock)reject;
- (void)isAvailable:(NSString *)checkoutID
              target:(NSDictionary *)target
           resolver:(RCTPromiseResolveBlock)resolve
           rejecter:(RCTPromiseRejectBlock)reject;
- (void)requiresUserInteraction:(NSString *)checkoutID
                          target:(NSDictionary *)target
                       resolver:(RCTPromiseResolveBlock)resolve
                       rejecter:(RCTPromiseRejectBlock)reject;
- (void)submit:(NSString *)checkoutID
         target:(NSDictionary *)target
       resolver:(RCTPromiseResolveBlock)resolve
       rejecter:(RCTPromiseRejectBlock)reject;
- (void)startDropIn:(NSString *)checkoutID
            resolver:(RCTPromiseResolveBlock)resolve
            rejecter:(RCTPromiseRejectBlock)reject;
- (void)respond:(NSDictionary *)response
        resolver:(RCTPromiseResolveBlock)resolve
        rejecter:(RCTPromiseRejectBlock)reject;
- (void)invalidate:(NSString *)checkoutID
           resolver:(RCTPromiseResolveBlock)resolve
           rejecter:(RCTPromiseRejectBlock)reject;
- (void)hostDidDisappear;
@end

@interface AdyenCheckoutTurboModule : NativeAdyenCheckoutSpecBase <NativeAdyenCheckoutSpec>
@property(nonatomic, strong) CheckoutTurboModuleAdapter *adapter;
@end

@implementation AdyenCheckoutTurboModule

+ (NSString *)moduleName
{
  return @"AdyenCheckout";
}

- (instancetype)init
{
  if ((self = [super init])) {
    _adapter = [CheckoutTurboModuleAdapter new];
    __weak AdyenCheckoutTurboModule *weakSelf = self;
    [_adapter setEventSink:^(NSDictionary *event) {
      AdyenCheckoutTurboModule *strongSelf = weakSelf;
      [strongSelf emitOnCheckoutEvent:event];
    }];
  }
  return self;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeAdyenCheckoutSpecJSI>(params);
}

- (void)setSdkVersion:(NSString *)sdkVersion
{
  [_adapter setSdkVersion:sdkVersion];
}

- (void)setupSession:(NSString *)sessionJson
   configurationJson:(NSString *)configurationJson
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject
{
  NSDictionary *session = [self dictionaryFromJSON:sessionJson reject:reject phase:@"setup"];
  NSDictionary *configuration = [self dictionaryFromJSON:configurationJson reject:reject phase:@"setup"];
  if (!session || !configuration) {
    return;
  }

  [_adapter setupSession:session
      configuration:configuration
           resolver:resolve
           rejecter:^(NSString *code, NSString *message, NSError *error) {
              reject(code ?: @"invalidConfiguration", message ?: @"Checkout setup failed", error);
            }];
}

- (void)setupAdvanced:(NSString *)paymentMethodsJson
    configurationJson:(NSString *)configurationJson
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject
{
  NSDictionary *paymentMethods = [self dictionaryFromJSON:paymentMethodsJson reject:reject phase:@"setup"];
  NSDictionary *configuration = [self dictionaryFromJSON:configurationJson reject:reject phase:@"setup"];
  if (!paymentMethods || !configuration) {
    return;
  }

  [_adapter setupAdvanced:paymentMethods
             configuration:configuration
                  resolver:resolve
                  rejecter:^(NSString *code, NSString *message, NSError *error) {
                     reject(code ?: @"invalidConfiguration", message ?: @"Checkout setup failed", error);
                   }];
}

- (void)isAvailable:(NSString *)checkoutId
             target:(NSDictionary *)target
            resolve:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject
{
  [_adapter isAvailable:checkoutId target:target resolver:resolve rejecter:reject];
}

- (void)requiresUserInteraction:(NSString *)checkoutId
                         target:(NSDictionary *)target
                        resolve:(RCTPromiseResolveBlock)resolve
                         reject:(RCTPromiseRejectBlock)reject
{
  [_adapter requiresUserInteraction:checkoutId target:target resolver:resolve rejecter:reject];
}

- (void)submit:(NSString *)checkoutId
        target:(NSDictionary *)target
       resolve:(RCTPromiseResolveBlock)resolve
        reject:(RCTPromiseRejectBlock)reject
{
  [_adapter submit:checkoutId target:target resolver:resolve rejecter:reject];
}

- (void)startDropIn:(NSString *)checkoutId
            resolve:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject
{
  [_adapter startDropIn:checkoutId resolver:resolve rejecter:reject];
}

- (void)respond:(JS::NativeAdyenCheckout::CheckoutResponse &)response
        resolve:(RCTPromiseResolveBlock)resolve
         reject:(RCTPromiseRejectBlock)reject
{
  // Generated records borrow C++-owned conversion storage. Copy every field before handing the
  // response to Swift, which may suspend while it validates and settles the request.
  NSString *checkoutID = [response.checkoutId() copy];
  NSString *operationID = [response.operationId() copy];
  NSString *requestID = [response.requestId() copy];
  NSString *kind = [response.kind() copy];
  NSString *payloadJSON = [response.payloadJson() copy];
  NSMutableDictionary *record = [@{
    @"checkoutId" : checkoutID ?: @"",
    @"operationId" : operationID ?: @"",
    @"requestId" : requestID ?: @"",
    @"kind" : kind ?: @"",
  } mutableCopy];
  if (payloadJSON) {
    record[@"payloadJson"] = payloadJSON;
  }
  [_adapter respond:record resolver:resolve rejecter:reject];
}

- (void)invalidate:(NSString *)checkoutId
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject
{
  [_adapter invalidate:checkoutId resolver:resolve rejecter:reject];
}

- (NSDictionary *)dictionaryFromJSON:(NSString *)json
                              reject:(RCTPromiseRejectBlock)reject
                               phase:(NSString *)phase
{
  NSData *data = [json dataUsingEncoding:NSUTF8StringEncoding];
  NSError *error = nil;
  id value = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:&error] : nil;
  if (![value isKindOfClass:[NSDictionary class]]) {
    reject(@"invalidConfiguration", [NSString stringWithFormat:@"Invalid %@ payload", phase], error);
    return nil;
  }
  return value;
}

- (void)invalidate
{
  [_adapter hostDidDisappear];
}

@end
