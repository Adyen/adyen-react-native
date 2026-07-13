//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

internal class BaseAddressModule: BaseActionModule {
    internal var lookupHandler: (([LookupAddressModel]) -> Void)?
    internal var lookupCompletionHandler: ((Result<PostalAddress, any Error>) -> Void)?

    override func supportedEvents() -> [String]! {
        super.supportedEvents() + EventName.addressLookupEvents.map(\.rawValue)
    }

    @objc
    func update(_ results: NSArray) {
        let addressModels: [LookupAddressModel] = results
            .compactMap { $0 as? NSDictionary }
            .compactMap { try? $0.decode() }

        ensureMainThread { [weak self] in
            self?.lookupHandler?(addressModels)
        }
    }

    @objc
    func confirm(_ success: NSNumber, address: NSDictionary) {
        if !success.boolValue, let message = address[Keys.message] as? String {
            let error = AddressError(message: message)
            return ensureMainThread { [weak self] in
                self?.lookupCompletionHandler?(.failure(error))
            }
        }

        let result: Result<PostalAddress, Error>

        do {
            let addressModel: LookupAddressModel = try address.decode()
            result = .success(addressModel.postalAddress)
        } catch {
            result = .failure(error)
        }

        ensureMainThread { [weak self] in
            self?.lookupCompletionHandler?(result)
        }
    }

    override func cleanUp() {
        lookupHandler = nil
        lookupCompletionHandler = nil
        super.cleanUp()
    }

    internal func sendAddressUpdate(searchTerm: String) {
        sendEvent(event: .updateAddress, body: searchTerm)
    }

    internal func sendAddressConfirm(json: [String: Any]) {
        sendEvent(event: .confirmAddress, body: json)
    }
}

extension BaseAddressModule: AddressLookupProvider {
    func lookUp(searchTerm: String, resultHandler: @escaping ([LookupAddressModel]) -> Void) {
        lookupHandler = resultHandler
        sendAddressUpdate(searchTerm: searchTerm)
    }

    func complete(
        incompleteAddress: LookupAddressModel,
        resultHandler: @escaping (Result<PostalAddress, any Error>) -> Void
    ) {
        lookupCompletionHandler = resultHandler
        sendAddressConfirm(json: incompleteAddress.jsonObject)
    }
}

struct AddressError: Error, LocalizedError, Codable {

    var errorDescription: String? {
        message
    }

    var message: String

    enum CodingKeys: CodingKey {
        case message
    }
}
