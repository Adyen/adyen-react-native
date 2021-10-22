# 3DS2 iOS SDK

With this SDK, you can accept 3D Secure 2.0 payments via Adyen.

## Installation

The SDK is available via [CocoaPods](http://cocoapods.org), [Carthage](https://github.com/Carthage/Carthage) or via manual installation.

### CocoaPods

1. Add `pod 'Adyen3DS2'` to your `Podfile`.
2. Run `pod install`.

### Carthage

1. Add `github "adyen/adyen-3ds2-ios"` to your `Cartfile`.
2. Run `carthage update`.
3. Link the framework with your target as described in [Carthage Readme](https://github.com/Carthage/Carthage#adding-frameworks-to-an-application).

### Dynamic Framework

Drag the dynamic `Adyen3DS2.framework` to the `Embedded Binaries` section in your general target settings. Select "Copy items if needed" when asked.

### Static Framework

1. In Xcode, select "File" and then "Add Files to...".
2. Select the static `Adyen3DS2.framework` and check "Copy items if needed", then select "Add".
3. In Xcode, select "File" and then "Add Files to...".
4. Select `Adyen3DS2.bundle` inside `Adyen3DS2.framework` and check "Copy items if needed", then select "Add".

### Swift Package Manager

1. Follow Apple's [Adding Package Dependencies to Your App](
https://developer.apple.com/documentation/xcode/adding_package_dependencies_to_your_app
) guide on how to add a Swift Package dependency.
2. Use `https://github.com/Adyen/adyen-3ds2-ios` as the repository URL.
3. Specify the version to be at least `2.2.1`.

:warning: _Please make sure to use Xcode 12.0+ when adding `Adyen3DS2` using Swift Package Manager._

:warning: _Swift Package Manager for Xcode 12.0 and 12.1 has a [know issue](https://bugs.swift.org/browse/SR-13343) when it comes to importing binary dependencies. A workaround is described [here](https://forums.swift.org/t/swiftpm-binarytarget-dependency-and-code-signing/38953)._

## Usage

### Creating a transaction

First, create an instance of `ADYServiceParameters` with the additional data retrieved from your call to `/authorise`.
Then, use the class method on `ADYService` to create a new service. This service can be used to create a new transaction.
```objc
ADYServiceParameters *parameters = [ADYServiceParameters new];
[parameters setDirectoryServerIdentifier:...]; // Retrieved from Adyen.
[parameters setDirectoryServerPublicKey:...]; // Retrieved from Adyen.

[ADYService serviceWithParameters:parameters appearanceConfiguration:nil completionHandler:^(ADYService *service) {
    NSError *error = nil;
    ADYTransaction *transaction = [service transactionWithMessageVersion:@"2.1.0" error:&error];
    if (transaction) {
        ADYAuthenticationRequestParameters *authenticationRequestParameters = [transaction authenticationRequestParameters];
        // Submit the authenticationRequestParameters to /authorise3ds2.
    } else {
        // An error occurred.
    }
}];
```

Use the `transaction`'s `authenticationRequestParameters` in your call to `/authorise3ds2`.

:warning: _`[ADYService transactionWithMessageVersion:error:]` defaults to the highest supported message version if nil is passed, if you want an older protocol version, make sure to specify it._

:warning: _Keep a reference to your `ADYTransaction` instance until the transaction is finished._

:warning: _If your application supports Mac catalyst or iPad OS multi-window/multi-scene, then its recommended to share the `ADYTransaction`/`ADYService` object(s) between scenes for the case if the shopper starts a transaction on one window and switch to another while the transaction is in progress._

### Performing a challenge

In case a challenge is required, create an instance of `ADYChallengeParameters` with values from the additional data retrieved from your call to `/authorise3ds2`.

```objc
NSDictionary *additionalData = ...; // Retrieved from Adyen.
ADYChallengeParameters *parameters = [ADYChallengeParameters challengeParametersWithServerTransactionIdentifier:additionalData[@"threeds2.threeDS2ResponseData.threeDSServerTransID"]
                                                                                         threeDSRequestorAppURL:[NSURL URLWithString:@"{YOUR_CUSTOM_APP_URL}"] // Or nil if for example you're using protocol version 2.1.0
                                                                                       ACSTransactionIdentifier:additionalData[@"threeds2.threeDS2ResponseData.acsTransID"]
                                                                                             ACSReferenceNumber:additionalData[@"threeds2.threeDS2ResponseData.acsReferenceNumber"]
                                                                                               ACSSignedContent:additionalData[@"threeds2.threeDS2ResponseData.acsSignedContent"]];
```

Use these challenge parameters to perform the challenge with the `transaction` you created earlier:
```objc
[transaction performChallengeWithParameters:parameters completionHandler:^(ADYChallengeResult *result, NSError *error) {
    if (result) {
        NSString *transactionStatus = [result transactionStatus];
        // Submit the transactionStatus to /authorise3ds2.
    } else {
        // An error occurred.
    }
}];
```

When the challenge is completed successfully, submit the `transactionStatus` in the `result` in your second call to `/authorise3ds2`.

### Customizing the UI

The SDK provides some customization options to ensure the UI of the challenge flow fits your app's look and feel. These customization options are available through the `ADYAppearanceConfiguration` class. To use them, create an instance of `ADYAppearanceConfiguration`, configure the desired properties and pass it during initialization of the `ADYService`.

For example, to make the Continue button red and change its corner radius:
```objc
ADYAppearanceConfiguration *appearanceConfiguration = [ADYAppearanceConfiguration new];
[[appearanceConfiguration buttonAppearanceForType:ADYAppearanceButtonTypeContinue] setBackgroundColor:[UIColor redColor]];
[[appearanceConfiguration buttonAppearanceForType:ADYAppearanceButtonTypeContinue] setTextColor:[UIColor whiteColor]];
[[appearanceConfiguration buttonAppearanceForType:ADYAppearanceButtonTypeContinue] setCornerRadius:3.0f];

[ADYService serviceWithParameters:parameters appearanceConfiguration:appearanceConfiguration completionHandler:...];
```

## See also

 * [Complete Documentation](https://docs.adyen.com/classic-integration/3d-secure-2-classic-integration/ios-sdk-integration/)

 * [SDK Reference](https://adyen.github.io/adyen-3ds2-ios/Docs/index.html)

## License

This SDK is available under the Apache License, Version 2.0. For more information, see the [LICENSE](https://github.com/Adyen/adyen-3ds2-ios/blob/master/LICENSE) file.
