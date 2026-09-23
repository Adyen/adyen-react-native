//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <ReactCommon/RCTTurboModule.h>

#import "AdyenPaymentSpec.h"

@interface ContextModule : NSObject
- (void)setSdkVersion:(NSString *)sdkVersion;
- (NSString *)committedCheckoutID;
- (void)setup:(NSDictionary *)session
    configuration:(NSDictionary *)configuration
         resolver:(RCTPromiseResolveBlock)resolve
         rejecter:(RCTPromiseRejectBlock)reject;
- (void)setupAdvanced:(NSDictionary *)paymentMethods
        configuration:(NSDictionary *)configuration
             resolver:(RCTPromiseResolveBlock)resolve
              rejecter:(RCTPromiseRejectBlock)reject;
- (void)isAvailable:(NSString *)type
           resolver:(RCTPromiseResolveBlock)resolve
           rejecter:(RCTPromiseRejectBlock)reject;
- (void)requiresUserInteraction:(NSString *)type
                       resolver:(RCTPromiseResolveBlock)resolve
                       rejecter:(RCTPromiseRejectBlock)reject;
- (void)submit:(NSString *)type;
- (void)cleanup;
@end

@interface AdyenCheckoutTurboModule : NativeAdyenCheckoutSpecBase <NativeAdyenCheckoutSpec>
@property(nonatomic, strong) ContextModule *context;
@end

@implementation AdyenCheckoutTurboModule

+ (NSString *)moduleName
{
  return @"AdyenCheckout";
}

- (instancetype)init
{
  if ((self = [super init])) {
    _context = [ContextModule new];
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
  [_context setSdkVersion:sdkVersion];
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

  __weak typeof(self) weakSelf = self;
  [_context setup:session
      configuration:configuration
           resolver:^(id result) {
             typeof(self) self = weakSelf;
             NSString *checkoutID = [self.context committedCheckoutID];
             NSDictionary *sessionResult = [result isKindOfClass:[NSDictionary class]] ? result : @{};
             id paymentMethods = sessionResult[@"paymentMethods"] ?: @{};
             NSError *error = nil;
             NSData *data = [NSJSONSerialization dataWithJSONObject:paymentMethods options:0 error:&error];
             if (!checkoutID || error) {
               reject(@"invalidConfiguration", @"Checkout setup did not commit", error);
               return;
             }
             resolve(@{
               @"checkoutId" : checkoutID,
               @"flow" : @"sessions",
               @"paymentMethodsJson" : [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding],
             });
           }
            reject:^(NSString *code, NSString *message, NSError *error) {
              reject(@"invalidConfiguration", message ?: @"Checkout setup failed", error);
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

  __weak typeof(self) weakSelf = self;
  [_context setupAdvanced:paymentMethods
             configuration:configuration
                  resolver:^(__unused id result) {
                    typeof(self) self = weakSelf;
                    NSString *checkoutID = [self.context committedCheckoutID];
                    if (!checkoutID) {
                      reject(@"invalidConfiguration", @"Checkout setup did not commit", nil);
                      return;
                    }
                    resolve(@{
                      @"checkoutId" : checkoutID,
                      @"flow" : @"advanced",
                      @"paymentMethodsJson" : paymentMethodsJson,
                    });
                  }
                   reject:^(NSString *code, NSString *message, NSError *error) {
                     reject(@"invalidConfiguration", message ?: @"Checkout setup failed", error);
                   }];
}

- (void)isAvailable:(NSString *)checkoutId
             target:(NSDictionary *)target
            resolve:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject
{
  NSString *type = [self regularTarget:target checkoutId:checkoutId reject:reject phase:@"query"];
  if (!type) {
    return;
  }
  [_context isAvailable:type resolver:resolve rejecter:reject];
}

- (void)requiresUserInteraction:(NSString *)checkoutId
                         target:(NSDictionary *)target
                        resolve:(RCTPromiseResolveBlock)resolve
                         reject:(RCTPromiseRejectBlock)reject
{
  NSString *type = [self regularTarget:target checkoutId:checkoutId reject:reject phase:@"query"];
  if (!type) {
    return;
  }
  [_context requiresUserInteraction:type resolver:resolve rejecter:reject];
}

- (void)submit:(NSString *)checkoutId
        target:(NSDictionary *)target
       resolve:(RCTPromiseResolveBlock)resolve
        reject:(RCTPromiseRejectBlock)reject
{
  NSString *type = [self regularTarget:target checkoutId:checkoutId reject:reject phase:@"presentation"];
  if (!type) {
    return;
  }
  [_context submit:type];
  resolve(nil);
}

- (void)startDropIn:(NSString *)checkoutId
            resolve:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject
{
  if (![self ownsCheckout:checkoutId]) {
    reject(@"staleCheckout", @"Checkout is no longer active", nil);
    return;
  }
  reject(@"unsupportedCapability", @"Drop-in is not available on this iOS SDK", nil);
}

- (void)respond:(JS::NativeAdyenCheckout::CheckoutResponse &)response
        resolve:(RCTPromiseResolveBlock)resolve
         reject:(RCTPromiseRejectBlock)reject
{
  if (![self ownsCheckout:response.checkoutId()]) {
    reject(@"staleRequest", @"Request is no longer active", nil);
    return;
  }
  // Correlated request handling is owned by the coordinator. This temporary adapter has no
  // pending callback for an unmatched response, so it must reject instead of inferring a target.
  reject(@"staleRequest", @"Request does not match an active callback", nil);
}

- (void)invalidate:(NSString *)checkoutId
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject
{
  if (![self ownsCheckout:checkoutId]) {
    reject(@"staleCheckout", @"Checkout is no longer active", nil);
    return;
  }
  [_context cleanup];
  resolve(nil);
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

- (BOOL)ownsCheckout:(NSString *)checkoutId
{
  return checkoutId.length > 0 && [checkoutId isEqualToString:[_context committedCheckoutID]];
}

- (NSString *)regularTarget:(NSDictionary *)target
                  checkoutId:(NSString *)checkoutId
                      reject:(RCTPromiseRejectBlock)reject
                       phase:(NSString *)phase
{
  if (![self ownsCheckout:checkoutId]) {
    reject(@"staleCheckout", @"Checkout is no longer active", nil);
    return nil;
  }
  if (![target[@"kind"] isEqualToString:@"paymentMethod"] ||
      ![target[@"type"] isKindOfClass:[NSString class]] ||
      [target[@"type"] length] == 0) {
    reject(@"invalidTarget", [NSString stringWithFormat:@"Invalid %@ target", phase], nil);
    return nil;
  }
  return target[@"type"];
}

@end
