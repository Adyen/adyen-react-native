//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

@testable import adyen_react_native
import UIKit
import XCTest

final class ThreadingSafetyTests: XCTestCase {

    override func tearDown() {
        BaseModule.currentPresenter = nil
        BaseModule.currentModule = nil
        BaseModule.session = nil
        EmbeddedComponentBusModule.shared = nil
        super.tearDown()
    }

    func test_baseModuleCleanUp_fromBackgroundThread_dismissesPresenterOnMainThread() {
        let expectation = expectation(description: "Presenter should be dismissed")
        let sut = TestableBaseModule()
        let presenter = MockPresenterViewController()
        presenter.onDismiss = {
            expectation.fulfill()
        }
        BaseModule.currentPresenter = presenter

        DispatchQueue.global().async {
            sut.cleanUp()
        }

        wait(for: [expectation], timeout: 1.0)
        XCTAssertTrue(presenter.dismissCalled)
        XCTAssertTrue(presenter.dismissCalledOnMainThread)
        XCTAssertNil(BaseModule.currentPresenter)
    }

    func test_embeddedComponentBusUnsubscribe_fromBackgroundThread_dismissesPresenterOnMainThread() {
        let expectation = expectation(description: "Presenter should be dismissed")
        let sut = EmbeddedComponentBusModule()
        let presenter = MockPresenterViewController()
        presenter.onDismiss = {
            expectation.fulfill()
        }
        BaseModule.currentPresenter = presenter

        sut.subscribe("card-view")

        DispatchQueue.global().async {
            sut.unsubscribe("card-view")
        }

        wait(for: [expectation], timeout: 1.0)
        XCTAssertTrue(presenter.dismissCalled)
        XCTAssertTrue(presenter.dismissCalledOnMainThread)
        XCTAssertNil(BaseModule.currentPresenter)
    }
}

private final class TestableBaseModule: BaseModule {
    override init() {
        super.init()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}

private final class MockPresenterViewController: UIViewController {
    var dismissCalled = false
    var dismissCalledOnMainThread = false
    var onDismiss: (() -> Void)?

    private var mockPresentedViewController: UIViewController? = UIViewController()

    override var presentedViewController: UIViewController? {
        mockPresentedViewController
    }

    override func dismiss(animated flag: Bool, completion: (() -> Void)? = nil) {
        dismissCalled = true
        dismissCalledOnMainThread = Thread.isMainThread
        mockPresentedViewController = nil
        completion?()
        onDismiss?()
    }
}
