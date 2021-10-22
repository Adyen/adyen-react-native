//
// Copyright (c) 2021 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation

/// :nodoc:
public protocol AnyAPIEnvironment {
    
    /// :nodoc:
    /// The base url.
    var baseURL: URL { get }
    
}
