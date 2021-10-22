# Adyen Networking for iOS

Adyen Networking for iOS provides a reusable, easy to use, generic http/https API client functionalities.

## Installation

Adyen Networking for iOS are available through either [CocoaPods](http://cocoapods.org), [Carthage](https://github.com/Carthage/Carthage) or [Swift Package Manager](https://swift.org/package-manager/).

### CocoaPods

1. Add `pod 'AdyenNetworking'` to your `Podfile`.
2. Run `pod install`.

### Carthage

1. Add `github "adyen/adyen-networking-ios"` to your `Cartfile`.
2. Run `carthage update`.
3. Link the framework with your target as described in [Carthage Readme](https://github.com/Carthage/Carthage#adding-frameworks-to-an-application).

### Swift Package Manager

1. Follow Apple's [Adding Package Dependencies to Your App](
https://developer.apple.com/documentation/xcode/adding_package_dependencies_to_your_app
) guide on how to add a Swift Package dependency.
2. Use `https://github.com/Adyen/adyen-networking-ios` as the repository URL.
3. Specify the version to be at least `1.0.0`.

## Usage

1. Create a `class/struct` that conforms to `AnyAPIContext`, to define the API that you're going to call.
2. Create a `class/struct` that conforms to `Request` protocol and another one conforming to the corresponding `Response` protocol for each endpoint you want to call from the API you defined in step 1.
3. Create an instance of  `APIClient` or one of the other convenience `APIClientProtocol` implementations, and perform the request:

```Swift
let apiClient = APIClient(apiContext: APIContext())
let request = GetUsersRequest()
apiClient.perform(request) { result in
    switch result {
    case let .success(response):
        print(response)
    case let .failure(error):
        print(error)
    }
}
```
Please check the `Networking Demo App` folder, for some code examples.

:warning: _Please make sure to retain the `APIClient` instance, otherwise the completion handler will not be called._

## Requirements

- iOS 11.0+
- Xcode 11.0+
- Swift 5.1

## Support

If you have a feature request, or spotted a bug or a technical problem, create a GitHub issue. For other questions, contact our [support team](https://support.adyen.com/hc/en-us/requests/new?ticket_form_id=360000705420).

## Contributing
We strongly encourage you to join us in contributing to this repository so everyone can benefit from it:
* New features and functionality
* Resolved bug fixes and issues
* Any general improvements


Read our [**contribution guidelines**](CONTRIBUTING.md) to find out how.

## License

This repository is open source and available under the MIT license. For more information, see the LICENSE file.
