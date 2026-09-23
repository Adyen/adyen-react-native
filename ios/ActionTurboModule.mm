//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <ReactCommon/RCTTurboModule.h>

#import "AdyenPaymentSpec.h"

@interface ActionTurboModuleAdapter : NSObject
- (void)handle:(NSDictionary *)action
  configuration:(NSDictionary *)configuration
       resolver:(RCTPromiseResolveBlock)resolve
       rejecter:(RCTPromiseRejectBlock)reject;
- (void)hideWithResolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;
- (void)getThreeDS2SdkVersionWithResolver:(RCTPromiseResolveBlock)resolve
                                  rejecter:(RCTPromiseRejectBlock)reject;
- (void)hostDidDisappear;
@end

@interface AdyenActionTurboModule : NativeAdyenActionSpecBase <NativeAdyenActionSpec>
@property(nonatomic, strong) ActionTurboModuleAdapter *adapter;
@end

@implementation AdyenActionTurboModule

+ (NSString *)moduleName
{
  return @"AdyenAction";
}

- (instancetype)init
{
  if ((self = [super init])) {
    _adapter = [ActionTurboModuleAdapter new];
  }
  return self;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeAdyenActionSpecJSI>(params);
}

- (void)handle:(NSString *)actionJson
  configurationJson:(NSString *)configurationJson
            resolve:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject
{
  NSDictionary *action = [self dictionaryFromJSON:actionJson reject:reject];
  NSDictionary *configuration = [self dictionaryFromJSON:configurationJson reject:reject];
  if (!action || !configuration) {
    return;
  }
  [_adapter handle:action configuration:configuration resolver:resolve rejecter:reject];
}

- (void)hide:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [_adapter hideWithResolver:resolve rejecter:reject];
}

- (void)getThreeDS2SdkVersion:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [_adapter getThreeDS2SdkVersionWithResolver:resolve rejecter:reject];
}

- (NSDictionary *)dictionaryFromJSON:(NSString *)json reject:(RCTPromiseRejectBlock)reject
{
  NSError *error = nil;
  NSData *data = [json dataUsingEncoding:NSUTF8StringEncoding];
  id value = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:&error] : nil;
  if (![value isKindOfClass:[NSDictionary class]]) {
    reject(@"parsingError", @"Invalid standalone action payload", error);
    return nil;
  }
  return value;
}

- (void)invalidate
{
  [_adapter hostDidDisappear];
}

@end
