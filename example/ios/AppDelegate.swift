import Adyen
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var reactNativeDelegate: ReactNativeDelegate?
    var reactNativeFactory: RCTReactNativeFactory?

    private var launchOptions: [UIApplication.LaunchOptionsKey: Any]?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        let delegate = ReactNativeDelegate()
        let factory = RCTReactNativeFactory(delegate: delegate)
        delegate.dependencyProvider = RCTAppDependencyProvider()

        reactNativeDelegate = delegate
        reactNativeFactory = factory
        self.launchOptions = launchOptions

        return true
    }

    func startReactNative(in window: UIWindow) {
        reactNativeFactory?.startReactNative(
            withModuleName: "AdyenExample",
            in: window,
            initialProperties: parseExternalConfig(),
            launchOptions: launchOptions
        )
    }

    func application(
        _ application: UIApplication,
        configurationForConnecting connectingSceneSession: UISceneSession,
        options: UIScene.ConnectionOptions
    ) -> UISceneConfiguration {
        UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }

    func application(_ application: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        RedirectComponent.applicationDidOpen(from: url)
    }

    private func parseExternalConfig() -> [String: Any] {
        let args = ProcessInfo.processInfo.arguments
        guard let configIndex = args.firstIndex(of: "-config"),
              configIndex + 1 < args.count else {
            return [:]
        }

        let base64String = args[configIndex + 1]
        guard let data = Data(base64Encoded: base64String),
              let jsonString = String(data: data, encoding: .utf8) else {
            return [:]
        }

        return ["externalConfig": jsonString]
    }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
    override func sourceURL(for bridge: RCTBridge) -> URL? {
        bundleURL()
    }

    override func bundleURL() -> URL? {
        #if DEBUG
            RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
        #else
            Bundle.main.url(forResource: "main", withExtension: "jsbundle")
        #endif
    }
}
