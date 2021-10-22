//
//  APIError.swift
//  AdyenNetworking
//
//  Created by Mohamed Eldoheiri on 7/27/21.
//

import Foundation

/// :nodoc:
/// Represents an API error object.
public struct HttpError: Decodable, Error, LocalizedError {
    
    /// :nodoc:
    /// The error code.
    public let errorCode: Int
    
    /// :nodoc:
    /// The error message.
    public let errorMessage: String
    
    /// :nodoc:
    /// The error human readable description.
    public var errorDescription: String? {
        errorMessage
    }

    private enum CodingKeys: String, CodingKey {
        case errorCode, errorMessage = "message"
    }
    
}
