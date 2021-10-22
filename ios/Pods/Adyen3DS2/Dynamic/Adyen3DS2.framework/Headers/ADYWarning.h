//
//  ADYWarning.h
//  Adyen3DS2
//
//  Copyright © 2018 Adyen. All rights reserved.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/**
 Enum describing the severity levels of warnings produced while conducting security checks.
 
 @note This enum corresponds to the `Severity` enum in the specification.
 */
typedef NS_ENUM(NSUInteger, ADYWarningSeverity) {
    
    /// Indicates a low-severity warning.
    ADYWarningSeverityLow,
    
    /// Indicates a medium-severity warning.
    ADYWarningSeverityMedium,
    
    /// Indicates a high-severity warning.
    ADYWarningSeverityHigh
    
};

/**
 Describes a warning produced while conducting security checks.
 
 @note This class corresponds to the `ChallengeParameters` class in the specification.
 */
@interface ADYWarning : NSObject

/**
 The identifier of the warning.
 */
@property (nonatomic, copy, readonly) NSString *identifier;

/**
 The message of the warning.
 */
@property (nonatomic, copy, readonly) NSString *message;

/**
 The severity level of the warning.
 */
@property (nonatomic, assign, readonly) ADYWarningSeverity severity;

+ (instancetype)new NS_UNAVAILABLE;
- (instancetype)init NS_UNAVAILABLE;

@end

NS_ASSUME_NONNULL_END
