// swift-tools-version: 6.0
//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import PackageDescription

// Swift Package Manager manifest for React Native's SwiftPM autolinking
// (react-native >= 0.87). CocoaPods consumers keep using adyen-react-native.podspec.
//
// The app's autolinker references this package through the symlink
// <app>/build/generated/autolinking/libs/AdyenReactNative, and SwiftPM resolves
// the relative React Native package paths below against that symlink location.
//
// SwiftPM cannot compile Swift and Objective-C in one target, so the sources are split:
// - `adyen_react_native`: the Swift sources. The module name matches the CocoaPods
//   module, so `import adyen_react_native` keeps working for consumers and tests.
// - `AdyenReactNative`: the Objective-C(++) bridge (RCT_EXTERN_MODULE declarations,
//   Fabric component views, ADYRedirectComponent). It depends on the Swift target
//   and imports its generated `adyen_react_native-Swift.h` header.

let reactHeaders: [Target.Dependency] = [
    .product(name: "ReactHeaders", package: "ReactNative"),
    .product(name: "ReactNativeHeaders", package: "ReactNative"),
    .product(name: "ReactNativeDependenciesHeaders", package: "ReactNative"),
    .product(name: "ReactAppHeaders", package: "React-GeneratedCode")
]

let objcSources = [
    "AdyenModule.m",
    "ADYRedirectComponent.m",
    "Views/CardView/ADYCardComponentViewBridge.m",
    "Views/CardView/ADYCardView.mm",
    "Views/PlatformView/ADYPlatformPayView.mm"
]

let objcHeaders = [
    "include",
    "Views/CardView/ADYCardComponentViewBridge.h",
    "Views/CardView/ADYCardView.h",
    "Views/PlatformView/ADYPlatformPayView.h"
]

let package = Package(
    name: "AdyenReactNative",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "AdyenReactNative", targets: ["AdyenReactNative", "adyen_react_native"])
    ],
    dependencies: [
        .package(url: "https://github.com/Adyen/adyen-ios", exact: "5.26.0"),
        .package(name: "ReactNative", path: "../../../../xcframeworks"),
        .package(name: "React-GeneratedCode", path: "../../../ios")
    ],
    targets: [
        .target(
            name: "adyen_react_native",
            dependencies: [
                .product(name: "Adyen", package: "adyen-ios"),
                .product(name: "AdyenActions", package: "adyen-ios"),
                .product(name: "AdyenCard", package: "adyen-ios"),
                .product(name: "AdyenComponents", package: "adyen-ios"),
                .product(name: "AdyenDropIn", package: "adyen-ios"),
                .product(name: "AdyenEncryption", package: "adyen-ios"),
                .product(name: "AdyenSession", package: "adyen-ios")
            ] + reactHeaders,
            path: ".",
            exclude: objcSources + objcHeaders,
            resources: [.copy("PrivacyInfo.xcprivacy")],
            swiftSettings: [.swiftLanguageMode(.v5)]
        ),
        .target(
            name: "AdyenReactNative",
            dependencies: ["adyen_react_native"] + reactHeaders,
            path: ".",
            // Xcode bundles any .xcprivacy under a target's path; the Swift target owns the manifest.
            exclude: ["PrivacyInfo.xcprivacy"],
            sources: objcSources,
            publicHeadersPath: "include",
            cSettings: [
                .headerSearchPath("Views/CardView"),
                .headerSearchPath("Views/PlatformView")
            ],
            cxxSettings: [
                .headerSearchPath("Views/CardView"),
                .headerSearchPath("Views/PlatformView"),
                // Matches the config-gated C++ ABI of the prebuilt React.framework.
                .define("DEBUG", .when(configuration: .debug)),
                .define("NDEBUG", .when(configuration: .release))
            ],
            linkerSettings: [
                .linkedFramework("UIKit"),
                .linkedFramework("Foundation"),
                .linkedFramework("PassKit")
            ]
        )
    ],
    cxxLanguageStandard: .cxx20
)
