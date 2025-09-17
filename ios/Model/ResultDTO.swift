  //
  // Copyright (c) 2025 Adyen N.V.
  //
  // This file is open source and available under the MIT license. See the LICENSE file for more info.
  //

import Foundation
import Adyen

struct ResultDTO {
  let result: SessionPaymentResultCode

  var jsonObject: [String: Any] {
    [
      Key.resultCode: result.rawValue,
    ]
  }

  private enum Key {
    static let resultCode = "resultCode"
  }
}
