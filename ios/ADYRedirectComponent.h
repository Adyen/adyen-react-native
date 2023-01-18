//
// Copyright (c) 2023 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface ADYRedirectComponent : NSObject

+ (BOOL)applicationOpenURL:(nonnull NSURL *)url;

@end

NS_ASSUME_NONNULL_END
