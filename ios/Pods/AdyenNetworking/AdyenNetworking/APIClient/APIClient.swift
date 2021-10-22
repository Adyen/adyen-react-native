//
// Copyright (c) 2021 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation
import UIKit

/// :nodoc:
/// Describes any API Client.
public protocol APIClientProtocol: AnyObject {
    
    /// :nodoc:
    typealias CompletionHandler<T> = (Result<T, Error>) -> Void
    
    /// :nodoc:
    /// Performs the API request.
    func perform<R: Request>(_ request: R, completionHandler: @escaping CompletionHandler<R.ResponseType>)
    
}

/// :nodoc:
extension APIClientProtocol {

    /// :nodoc:
    public func retryAPIClient(with scheduler: Scheduler) -> AnyRetryAPIClient {
        RetryAPIClient(apiClient: self, scheduler: scheduler)
    }
}

/// :nodoc:
/// The Basic API Client.
public final class APIClient: APIClientProtocol {
    
    /// :nodoc:
    public typealias CompletionHandler<T> = (Result<T, Error>) -> Void
    
    /// :nodoc:
    /// The API context.
    public let apiContext: AnyAPIContext
    
    /// :nodoc:
    /// Initializes the API client.
    ///
    /// - Parameters:
    ///   - environment: The API environment.
    public init(apiContext: AnyAPIContext) {
        self.apiContext = apiContext
    }
    
    /// :nodoc:
    public func perform<R: Request>(_ request: R, completionHandler: @escaping CompletionHandler<R.ResponseType>) {
        let url = apiContext.environment.baseURL.appendingPathComponent(request.path)

        var urlRequest = URLRequest(url: add(queryParameters: request.queryParameters + apiContext.queryParameters, to: url))
        urlRequest.httpMethod = request.method.rawValue
        urlRequest.allHTTPHeaderFields = request.headers.merging(apiContext.headers, uniquingKeysWith: { key1, _ in key1 })
        if request.method == .post {
            do {
                urlRequest.httpBody = try Coder.encode(request)
            } catch {
                return completionHandler(.failure(error))
            }
        }

        log(urlRequest: urlRequest, request: request)
        
        requestCounter += 1
        
        urlSession.dataTask(with: urlRequest) { [weak self] result in
            self?.handle(result, request, completionHandler: completionHandler)
        }.resume()
    }

    private func log<R: Request>(urlRequest: URLRequest, request: R) {
        adyenPrint("---- Request (/\(request.path)) ----")

        if let body = urlRequest.httpBody {
            printAsJSON(body)
        }
        
        adyenPrint("---- Request base url (/\(request.path)) ----")
        adyenPrint(apiContext.environment.baseURL)

        if let headers = urlRequest.allHTTPHeaderFields {
            adyenPrint("---- Request Headers (/\(request.path)) ----")
            adyenPrint(headers)
        }

        if let queryParams = urlRequest.url?.queryParameters {
            adyenPrint("---- Request query (/\(request.path)) ----")
            adyenPrint(queryParams)
        }

    }

    private func handle<R: Request>(_ result: Result<URLSessionSuccess, Error>,
                                    _ request: R,
                                    completionHandler: @escaping CompletionHandler<R.ResponseType>) {
        requestCounter -= 1

        switch result {
        case let .success(result):
            do {
                adyenPrint("---- Response (/\(request.path)) ----")
                printAsJSON(result.data)
                
                let response = try Coder.decode(result.data) as R.ResponseType
                completionHandler(.success(response))
            } catch {
                if let errorResponse: R.ErrorResponseType = try? Coder.decode(result.data) {
                    completionHandler(.failure(errorResponse))
                } else if (200...299).contains(result.response.statusCode) == false {
                    completionHandler(.failure(HttpError(errorCode: result.response.statusCode,
                                                         errorMessage: "Http \(result.response.statusCode) error")))
                } else {
                    completionHandler(.failure(error))
                }
            }
        case let .failure(error):
            completionHandler(.failure(error))
        }
    }
    
    /// :nodoc:
    private func add(queryParameters: [URLQueryItem], to url: URL) -> URL {
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        if !queryParameters.isEmpty {
            components?.queryItems = queryParameters
        }
        return components?.url ?? url
    }
    
    /// :nodoc:
    private lazy var urlSession: URLSession = {
        let config = URLSessionConfiguration.ephemeral
        config.urlCache = nil

        if #available(iOS 13.0, *) {
            config.tlsMinimumSupportedProtocolVersion = .TLSv12
        } else {
            config.tlsMinimumSupportedProtocol = .tlsProtocol12
        }

        return URLSession(configuration: config, delegate: nil, delegateQueue: .main)
    }()
    
    /// :nodoc:
    private var requestCounter = 0 {
        didSet {
            let application = UIApplication.shared
            application.isNetworkActivityIndicatorVisible = self.requestCounter > 0
        }
    }
    
}

internal func printAsJSON(_ data: Data) {
    guard Logging.isEnabled else { return }
    do {
        let jsonObject = try JSONSerialization.jsonObject(with: data, options: [])
        let jsonData = try JSONSerialization.data(withJSONObject: jsonObject, options: [.prettyPrinted])
        guard let jsonString = String(data: jsonData, encoding: .utf8) else { return }

        adyenPrint(jsonString)
    } catch {
        if let string = String(data: data, encoding: .utf8) {
            adyenPrint(string)
        }
    }
}
