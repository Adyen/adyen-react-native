//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

@testable import adyen_react_native
import XCTest

@MainActor
final class CallbackBridgeTests: XCTestCase {

    // MARK: - Suspension and resumption

    func test_suspend_emitsOnceSuspended() async {
        // GIVEN
        let bridge = CallbackBridge<String>()
        var emitted = false

        // WHEN
        Task { bridge.resolve("done") }
        let result = await bridge.suspend(superseding: "superseded") { emitted = true }

        // THEN
        XCTAssertTrue(emitted)
        XCTAssertEqual(result, "done")
    }

    func test_isAwaiting_isFalseBeforeAndAfterSuspension() async {
        // GIVEN
        let bridge = CallbackBridge<String>()
        XCTAssertFalse(bridge.isAwaiting)

        // WHEN
        Task {
            // Give the suspension a chance to register before resolving it.
            while !bridge.isAwaiting {
                await Task.yield()
            }
            bridge.resolve("done")
        }
        _ = await bridge.suspend(superseding: "superseded") {}

        // THEN
        XCTAssertFalse(bridge.isAwaiting)
    }

    // MARK: - Resolving when nothing is pending

    func test_resolve_withNothingSuspended_isIgnored() {
        // GIVEN
        let bridge = CallbackBridge<String>()

        // WHEN / THEN — a late or duplicate response must not crash on a double resume
        bridge.resolve("late")
        bridge.resolve("later")
        XCTAssertFalse(bridge.isAwaiting)
    }

    func test_resolve_twiceForOneSuspension_resumesOnlyOnce() async {
        // GIVEN
        let bridge = CallbackBridge<String>()

        // WHEN
        Task {
            while !bridge.isAwaiting {
                await Task.yield()
            }
            bridge.resolve("first")
            bridge.resolve("second")
        }
        let result = await bridge.suspend(superseding: "superseded") {}

        // THEN
        XCTAssertEqual(result, "first")
    }

    // MARK: - Superseding

    func test_suspend_whileAlreadySuspended_settlesThePreviousCall() async {
        // GIVEN a call already suspended
        let bridge = CallbackBridge<String>()
        let first = Task { await bridge.suspend(superseding: "superseded") {} }
        while !bridge.isAwaiting {
            await Task.yield()
        }

        // WHEN a second call supersedes it
        let second = Task { await bridge.suspend(superseding: "superseded") {} }
        // Let the second suspension replace the first, then resolve it.
        await Task.yield()
        while !bridge.isAwaiting {
            await Task.yield()
        }
        bridge.resolve("resolved")

        // THEN the superseded call is settled rather than left to leak, and the new one wins
        let firstResult = await first.value
        let secondResult = await second.value
        XCTAssertEqual(firstResult, "superseded")
        XCTAssertEqual(secondResult, "resolved")
    }
}
