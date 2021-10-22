//
// Copyright (c) 2021 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation

/// :nodoc:
/// Protocol that describes an API context used for retrieving internal resources
public protocol AnyAPIContext {
    
    /// :nodoc:
    var environment: AnyAPIEnvironment { get }
    
    /// :nodoc:
    var headers: [String: String] { get }
    
    /// :nodoc:
    var queryParameters: [URLQueryItem] { get }
    
}
