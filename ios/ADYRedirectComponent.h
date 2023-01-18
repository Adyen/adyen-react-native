//
// Copyright (c) 2023 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// Handles any redirect Url whether its an App custom scheme url, or an app universal link.
@interface ADYRedirectComponent : NSObject

/// This function should be invoked from the application's delegate when the application is opened through a URL.
///
/// - Parameter url: The URL through which the application was opened.
/// - Returns: A boolean value indicating whether the URL was handled by the redirect component.
+ (BOOL)applicationOpenURL:(nonnull NSURL *)url;

@end

NS_ASSUME_NONNULL_END
