//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

internal class BaseAddressModule: BaseActionModule {

    /// Invoked with the address candidates returned by JS for a search term.
    /// Populated by the v6 card configuration's address-lookup closure (see components milestone).
    internal var lookupHandler: (([AddressLookupResult]) -> Void)?

    /// Invoked with the completed address (or error) selected by the shopper via JS.
    internal var lookupCompletionHandler: ((Result<PostalAddress, any Error>) -> Void)?

    override func supportedEvents() -> [String]! {
        super.supportedEvents() + EventName.addressLookupEvents.map(\.rawValue)
    }

    @objc
    func update(_ results: NSArray) {
        guard let lookupHandler else { return }

        let addressResults: [AddressLookupResult] = results
            .compactMap { $0 as? NSDictionary }
            .map { dictionary in
                let identifier = dictionary[AddressKey.id] as? String ?? ""
                let addressDictionary = dictionary[AddressKey.address] as? [String: Any] ?? [:]
                return AddressLookupResult(identifier: identifier,
                                           postalAddress: Self.postalAddress(from: addressDictionary))
            }
        DispatchQueue.main.async {
            lookupHandler(addressResults)
        }
    }

    @objc
    func confirm(_ success: NSNumber, address: NSDictionary) {
        guard let lookupCompletionHandler else { return }

        DispatchQueue.main.async {
            if !success.boolValue, let message = address[Keys.message] as? String {
                return lookupCompletionHandler(.failure(AddressError(message: message)))
            }

            let addressDictionary = address[AddressKey.address] as? [String: Any] ?? [:]
            lookupCompletionHandler(.success(Self.postalAddress(from: addressDictionary)))
        }
    }

    override func cleanUp() {
        ensureMainThread { [weak self] in
            self?.lookupHandler = nil
            self?.lookupCompletionHandler = nil
        }
        super.cleanUp()
    }

    internal func sendAddressUpdate(searchTerm: String) {
        sendEvent(event: .updateAddress, body: searchTerm)
    }

    internal func sendAddressConfirm(json: [String: Any]) {
        sendEvent(event: .confirmAddress, body: json)
    }

    private static func postalAddress(from dictionary: [String: Any]) -> PostalAddress {
        PostalAddress(
            city: dictionary[AddressKey.city] as? String,
            country: dictionary[AddressKey.country] as? String,
            houseNumberOrName: dictionary[AddressKey.houseNumberOrName] as? String,
            postalCode: dictionary[AddressKey.postalCode] as? String,
            stateOrProvince: dictionary[AddressKey.stateOrProvince] as? String,
            street: dictionary[AddressKey.street] as? String
        )
    }

    private enum AddressKey {
        static let id = "id"
        static let address = "address"
        static let city = "city"
        static let country = "country"
        static let houseNumberOrName = "houseNumberOrName"
        static let postalCode = "postalCode"
        static let stateOrProvince = "stateOrProvince"
        static let street = "street"
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
