//
// Copyright (c) 2025 Adyen N.V.
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
}
