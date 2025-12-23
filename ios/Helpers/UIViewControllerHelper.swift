//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import UIKit

extension UIViewController {
    internal static var topPresenter: UIViewController? {
        var topController: UIViewController? = {
            if #available(iOS 13, *) {
                return UIApplication.shared.connectedScenes
                    .compactMap { $0 as? UIWindowScene }
                    .first { $0.activationState == .foregroundActive }?
                    .windows
                    .first(where: \.isKeyWindow)?
                    .rootViewController
            } else {
                return UIApplication.shared.keyWindow?.rootViewController
            }
        }()

        while let presenter = topController?.presentedViewController {
            topController = presenter
        }
        return topController
    }
}
