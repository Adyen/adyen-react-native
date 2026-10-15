//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Foundation

/// The exact payment method instance a published id refers to.
internal enum CatalogPaymentMethod: Equatable {
    /// A regular payment method at `index` of the checkout's regular list.
    ///
    /// The published SDK can only create regular components by type, and it always resolves the
    /// first instance of that type. `isFirstOfType` records whether the SDK would build this exact
    /// instance; later same-type instances (for example several gift card brands) are never
    /// silently replaced by the first one.
    case regular(index: Int, type: PaymentMethodType, isFirstOfType: Bool)
    case stored(identifier: String)

    /// Lookup configuration is applied to the regular card component only.
    var supportsAddressLookup: Bool {
        guard case let .regular(_, type, _) = self else { return false }
        return type.rawValue == "scheme"
    }
}

/// Immutable id snapshot of one checkout's payment methods.
///
/// Regular methods receive a freshly minted id; stored methods keep their API identifier. The
/// stamped JSON is what JavaScript receives, so every id it can send back resolves here.
internal struct PaymentMethodCatalog {

    private static let regularKey = "paymentMethods"

    let paymentMethodsJSON: [String: Any]
    let regularIDs: [String]
    let storedIDs: [String]
    private let entries: [String: CatalogPaymentMethod]

    init(paymentMethods: PaymentMethods, makeID: () -> String = { UUID().uuidString }) {
        var json = paymentMethods.jsonObject
        var entries: [String: CatalogPaymentMethod] = [:]
        var storedIDs: [String] = []

        for stored in paymentMethods.stored where entries[stored.identifier] == nil {
            entries[stored.identifier] = .stored(identifier: stored.identifier)
            storedIDs.append(stored.identifier)
        }

        var regularJSON = json[Self.regularKey] as? [[String: Any]] ?? []
        var regularIDs: [String] = []
        var firstIndexByType: [PaymentMethodType: Int] = [:]
        for (index, paymentMethod) in paymentMethods.regular.enumerated() where index < regularJSON.count {
            var id = makeID()
            while id.isEmpty || entries[id] != nil {
                id = UUID().uuidString
            }
            let firstIndex = firstIndexByType[paymentMethod.type] ?? index
            firstIndexByType[paymentMethod.type] = firstIndex
            entries[id] = .regular(index: index, type: paymentMethod.type, isFirstOfType: firstIndex == index)
            regularJSON[index]["id"] = id
            regularIDs.append(id)
        }
        json[Self.regularKey] = regularJSON

        paymentMethodsJSON = json
        self.regularIDs = regularIDs
        self.storedIDs = storedIDs
        self.entries = entries
    }

    func paymentMethod(for id: String) -> CatalogPaymentMethod? {
        entries[id]
    }
}
