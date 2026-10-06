//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

@testable import adyen_react_native
import XCTest

@MainActor
final class ThreadingSafetyTests: XCTestCase {

    func test_ensureMainThread_runsImmediately_whenAlreadyOnMainThread() {
        // GIVEN we are already running on the main thread
        let expectation = expectation(description: "Work should run immediately")

        DispatchQueue.main.async {
            var didRun = false

            // WHEN ensureMainThread is called
            ensureMainThread {
                didRun = true
                XCTAssertTrue(Thread.isMainThread)
            }

            // THEN the work runs synchronously, without an extra dispatch
            XCTAssertTrue(didRun)
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func test_ensureMainThread_dispatchesWorkToMainThread_fromBackgroundThread() {
        // GIVEN we are running on a background thread
        let expectation = expectation(description: "Work should run on main thread")

        // WHEN ensureMainThread is called
        DispatchQueue.global().async {
            ensureMainThread {
                // THEN the work is dispatched to and executed on the main thread
                XCTAssertTrue(Thread.isMainThread)
                expectation.fulfill()
            }
        }

        wait(for: [expectation], timeout: 1.0)
    }
}
