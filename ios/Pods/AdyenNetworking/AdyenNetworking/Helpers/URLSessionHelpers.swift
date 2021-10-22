//
// Copyright (c) 2021 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation

internal struct URLSessionSuccess {
    internal let data: Data
    
    internal let response: HTTPURLResponse
}

/// :nodoc:
internal extension URLSession {
    /// :nodoc:
    func dataTask(with url: URL, completion: @escaping ((Result<URLSessionSuccess, Error>) -> Void)) -> URLSessionDataTask {
        dataTask(with: url, completionHandler: { data, response, error in
            self.handle(data: data, response: response, error: error, completion: completion)
        })
    }

    /// :nodoc:
    func dataTask(with urlRequest: URLRequest, completion: @escaping ((Result<URLSessionSuccess, Error>) -> Void)) -> URLSessionDataTask {
        dataTask(with: urlRequest, completionHandler: { data, response, error in
            self.handle(data: data, response: response, error: error, completion: completion)
        })
    }

    /// :nodoc:
    private func handle(data: Data?, response: URLResponse?, error: Error?, completion: @escaping ((Result<URLSessionSuccess, Error>) -> Void)) {
        let httpResponse = response as? HTTPURLResponse
        if let headers = httpResponse?.allHeaderFields,
           let path = response?.url?.path {
            adyenPrint("---- Response Headers (/\(path)) ----")
            adyenPrint(headers)
        }

        if let error = error {
            completion(.failure(error))
        } else if let data = data, let response = response as? HTTPURLResponse {
            completion(.success(URLSessionSuccess(data: data, response: response)))
        } else {
            fatalError("Invalid response.")
        }
    }
}
