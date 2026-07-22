//
// Copyright (c) 2024 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation

internal final class SDKVersion: NSObject {
    private static let fileName = "Version"
    private static let fileExtension = "ts"
    private static let resourceBundleName = "adyen-react-native"
    private static let pattern = "export const adyenSDKVersion = '([^']+)';"

    static var current: String {
        bundles.lazy
            .compactMap { resourceBundle(in: $0) }
            .compactMap { version(in: $0) }
            .first ?? ""
    }

    static func parse(_ source: String) -> String? {
        guard let expression = try? NSRegularExpression(pattern: pattern) else {
            return nil
        }
        let range = NSRange(source.startIndex..., in: source)
        guard let match = expression.firstMatch(in: source, range: range),
              let versionRange = Range(match.range(at: 1), in: source) else {
            return nil
        }
        return String(source[versionRange])
    }

    private static let bundles = [Bundle.main, Bundle(for: SDKVersion.self)]

    private static func resourceBundle(in bundle: Bundle) -> Bundle? {
        guard let url = bundle.url(forResource: resourceBundleName, withExtension: "bundle") else {
            return nil
        }
        return Bundle(url: url)
    }

    private static func version(in bundle: Bundle) -> String? {
        guard let url = bundle.url(forResource: fileName, withExtension: fileExtension),
              let source = try? String(contentsOf: url, encoding: .utf8) else {
            return nil
        }
        return parse(source)
    }
}

internal let adyenSDKVersion = SDKVersion.current
