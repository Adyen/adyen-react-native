//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

internal let errorResultCode = CheckoutResultCode.error.rawValue
internal let errorSubmitResult = SubmitResult.completion(resultCode: errorResultCode)
internal let errorAdditionalDetailsResult = AdditionalDetailsResult.completion(resultCode: errorResultCode)
