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
            if let match: T = subview.findSubview() {
                return match
            }
        }
        return nil
    }

    /// Stops this view and all the views inside it from growing their layout margins with the safe area.
    func ignoreSafeAreaInLayoutMargins() {
        insetsLayoutMarginsFromSafeArea = false
        subviews.forEach { $0.ignoreSafeAreaInLayoutMargins() }
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
