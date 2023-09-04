//
// Copyright (c) 2023 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import XCTest
import React

final class DropInTest: XCTestCase {
  private let timeout: TimeInterval! = TimeInterval(exactly: 6)
  
  override func setUpWithError() throws {
    // Put setup code here. This method is called before the invocation of each test method in the class.
  }
  
  override func tearDownWithError() throws {
    // Put teardown code here. This method is called after the invocation of each test method in the class.
  }
  
  func testOpenApp() throws {
    let vc = RCTSharedApplication()!.keyWindow!.rootViewController!
    let timeoutDate = Date(timeIntervalSinceNow: timeout)
    var success = false
    var redboxError: String? = nil
    
#if DEBUG
    RCTSetLogFunction({ level, source, fileName, lineNumber, message in
      if (level.rawValue >= RCTLogLevel.error.rawValue ) {
        redboxError = message;
      }
    })
#endif
    
    while Date() < timeoutDate && !success {
      wait(for: .milliseconds(100))
      success = findSubview(in: vc.view, that: {$0.accessibilityLabel == "Checkout"} )
    }
    
#if DEBUG
    RCTSetLogFunction(RCTDefaultLogFunction)
#endif
    
    XCTAssertNil(redboxError, "RedBox error: \(redboxError!)")
    XCTAssertTrue(success)
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
