//
// Copyright (c) 2023 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import XCTest
import React

final class DropInTest: XCTestCase {
  
  private let timeout: TimeInterval! = TimeInterval(exactly: 600)

    override func setUpWithError() throws {
        // Put setup code here. This method is called before the invocation of each test method in the class.
    }

    override func tearDownWithError() throws {
        // Put teardown code here. This method is called after the invocation of each test method in the class.
    }

    func testOpenDropIn() throws {
      let vc = RCTSharedApplication()!.keyWindow!.rootViewController!
      let timeoutDate = Date(timeIntervalSinceNow: timeout)
      var success = false
      var redboxError: String? = nil
      
      #if DEBUG
      RCTLogFunction((level, source, fileName, lineNumber, message) -> {
        if (level >= RCTLogLevel.error ) {
          redboxError = message;
        }
      })
      #endif
      
      while Date() < timeoutDate && !success {
        RunLoop.main.run(mode: .default, before: Date(timeIntervalSinceNow: 0.1))
        RunLoop.main.run(mode: .common, before: Date(timeIntervalSinceNow: 0.1))
        
        success = findSubview(in: vc.view, that: {$0.accessibilityLabel == "Checkout"} )
      }
      
      #if DEBUG
      RCTLogFunction(RCTDefaultLogFunction)
      #endif
      
      XCTAssertNil(redboxError, "RedBox error: \(redboxError!)")
      XCTAssertTrue(success)
    }

    func testPerformanceExample() throws {
        // This is an example of a performance test case.
        self.measure {
            // Put the code you want to measure the time of here.
        }
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
