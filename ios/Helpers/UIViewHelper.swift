//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

extension UIView {
    func findSubview<T: UIView>() -> T? {
        for subview in subviews {
            if let match = subview as? T {
                return match
            }
            if let match = subview.findSubview() as? T {
                return match
            }
        }
        return nil
    }

    var parentViewController: UIViewController? {
        var responder: UIResponder? = self
        while let nextResponder = responder?.next {
            if let viewController = nextResponder as? UIViewController {
                return viewController
            }
            responder = nextResponder
        }
        return nil
    }
}
