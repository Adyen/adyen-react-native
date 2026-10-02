//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <ReactCommon/RCTTurboModule.h>

#import "AdyenPaymentSpec.h"

@interface CSETurboModuleAdapter : NSObject
- (void)encryptCard:(NSDictionary *)card publicKey:(NSString *)publicKey resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;
- (void)encryptBin:(NSString *)bin publicKey:(NSString *)publicKey resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;
- (void)validateCardNumber:(NSString *)number enableLuhnCheck:(BOOL)enabled resolver:(RCTPromiseResolveBlock)resolve;
- (void)validateCardExpiryMonth:(NSString *)month year:(NSString *)year resolver:(RCTPromiseResolveBlock)resolve;
- (void)validateCardSecurityCode:(NSString *)code brand:(NSString *)brand resolver:(RCTPromiseResolveBlock)resolve;
@end

@interface AdyenCSETurboModule : NativeAdyenCSESpecBase <NativeAdyenCSESpec>
@property(nonatomic, strong) CSETurboModuleAdapter *adapter;
@end

@implementation AdyenCSETurboModule

+ (NSString *)moduleName
{
  return @"AdyenCSE";
}

- (instancetype)init
{
  if ((self = [super init])) {
    _adapter = [CSETurboModuleAdapter new];
  }
  return self;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeAdyenCSESpecJSI>(params);
}

- (void)encryptCard:(NSString *)cardJson
          publicKey:(NSString *)publicKey
            resolve:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject
{
  NSError *error = nil;
  NSData *data = [cardJson dataUsingEncoding:NSUTF8StringEncoding];
  id card = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:&error] : nil;
  if (![card isKindOfClass:[NSDictionary class]]) {
    reject(@"Encryption failed", @"Invalid card payload", error);
    return;
  }
  [_adapter encryptCard:card publicKey:publicKey resolver:resolve rejecter:reject];
}

- (void)encryptBin:(NSString *)bin publicKey:(NSString *)publicKey resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [_adapter encryptBin:bin publicKey:publicKey resolver:resolve rejecter:reject];
}

- (void)validateCardNumber:(NSString *)number enableLuhnCheck:(BOOL)enabled resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [_adapter validateCardNumber:number enableLuhnCheck:enabled resolver:resolve];
}

- (void)validateCardExpiryDate:(NSString *)month expiryYear:(NSString *)year resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [_adapter validateCardExpiryMonth:month year:year resolver:resolve];
}

- (void)validateCardSecurityCode:(NSString *)code cardBrand:(NSString *)brand resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [_adapter validateCardSecurityCode:code brand:brand resolver:resolve];
}

@end
