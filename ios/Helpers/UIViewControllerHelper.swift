//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import UIKit

extension UIViewController {
    @MainActor
    internal static var topPresenter: UIViewController? {
        let keyWindow: UIWindow?
        if #available(iOS 13, *) {
            keyWindow = UIApplication.shared.connectedScenes
                .filter { $0.activationState == .foregroundActive }
                .compactMap { $0 as? UIWindowScene }
                .first?
                .windows
                .first(where: \.isKeyWindow)
        } else {
            keyWindow = UIApplication.shared.keyWindow
        }

        var topController: UIViewController? = keyWindow?.rootViewController

        while let presenter = topController?.presentedViewController {
            topController = presenter
        }
        return topController
    }
}
