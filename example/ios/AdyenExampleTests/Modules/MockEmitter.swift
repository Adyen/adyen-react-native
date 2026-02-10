//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

@testable import adyen_react_native
import Foundation

final class MockEmitter: EventEmitter {

    struct EventRecord {
        let name: String
        let body: Any?
    }

    private(set) var events: [EventRecord] = []

    func send(event: Events, body: Any?) {
        events.append(EventRecord(name: event.rawValue, body: body))
    }

    func clear() {
        events.removeAll()
    }

    func lastEvent(named name: String) -> EventRecord? {
        events.last { $0.name == name }
    }

    func eventCount(named name: String) -> Int {
        events.filter { $0.name == name }.count
    }
}
