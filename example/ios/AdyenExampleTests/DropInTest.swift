//
// Copyright (c) 2023 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import React
import XCTest

final class DropInTest: XCTestCase {
    private let timeout: TimeInterval! = TimeInterval(exactly: 60 * 2)

    override func setUpWithError() throws {
        // Put setup code here. This method is called before the invocation of each test method in the class.
    }

    override func tearDownWithError() throws {
        // Put teardown code here. This method is called after the invocation of each test method in the class.
    }

    func testForTest() {
        XCTAssert(true, "Test are running")
    }

    func testCheckNoErrorsWhenOpenApp() throws {
        let vc = RCTSharedApplication()!.keyWindow!.rootViewController!
        let timeoutDate = Date(timeIntervalSinceNow: timeout)
        var success = false
        var redboxError: String?
        RCTSetLogFunction { level, _, _, _, message in
            if level.rawValue >= RCTLogLevel.error.rawValue {
                redboxError = message
            }
        }

        while Date() < timeoutDate, !success {
            wait(for: .seconds(10))
            success = findSubview(in: vc.view, that: { $0.accessibilityLabel == "Checkout" })
        }

        RCTSetLogFunction(RCTDefaultLogFunction)

        XCTAssertNil(redboxError, "RedBox error: \(redboxError!)")
        // XCTAssertTrue(success, "View Herarchy: \(printSubview(in: vc.view))")
        // TODO: make a screenshot
        print(printSubview(in: vc.view))
    }

    func findSubview(in view: UIView, that predicate: (UIView) -> Bool) -> Bool {
        if predicate(view) {
            return true
        }

        for subview in view.subviews {
            if findSubview(in: subview, that: predicate) {
                return true
            }
        }

        return false
    }

    func printSubview(in view: UIView) -> String {
        var buffer = ""
        printSubview(in: view, bufer: &buffer, tab: "")
        return buffer
    }

    private func printSubview(in view: UIView, bufer: inout String, tab: String) {
        bufer.append("\(tab)\(NSStringFromClass(type(of: view.self))) - \(view.accessibilityLabel ?? "")\n")
        for subview in view.subviews {
            printSubview(in: subview, bufer: &bufer, tab: tab + " ")
        }
    }

}

extension XCTestCase {
    func wait(for interval: DispatchTimeInterval) {
        let dummyExpectation = XCTestExpectation(description: "wait for a few seconds.")

        DispatchQueue.main.asyncAfter(deadline: DispatchTime.now() + interval) {
            dummyExpectation.fulfill()
        }

        wait(for: [dummyExpectation], timeout: 100)
    }

    func waitFor(predicate: @escaping () -> Bool) {
        let dummyExpectation = XCTNSPredicateExpectation(predicate: NSPredicate(block: { _, _ in
            predicate()
        }), object: nil)

        wait(for: [dummyExpectation], timeout: 100)
    }
}
