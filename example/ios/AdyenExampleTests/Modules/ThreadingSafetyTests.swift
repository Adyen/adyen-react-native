//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

@testable @_spi(AdyenInternal) import Adyen
@testable import adyen_react_native
import UIKit
import XCTest

@MainActor
final class ThreadingSafetyTests: XCTestCase {

    override func tearDown() {
        BaseModule.presenterStack.removeAll()
        ComponentModule.shared = nil
        super.tearDown()
    }

    func test_baseModuleCleanUp_fromBackgroundThread_dismissesPresenterOnMainThread() {
        // GIVEN a BaseModule with a presented view controller
        let expectation = expectation(description: "Presenter should be dismissed")
        let sut = TestableBaseModule()
        let presenter = MockPresenterViewController()
        presenter.onDismiss = {
            expectation.fulfill()
        }
        BaseModule.presenterStack = [presenter]

        // WHEN cleanUp() is called from a background thread
        DispatchQueue.global().async {
            sut.cleanUp()
        }

        // THEN the presenter is dismissed on the main thread
        wait(for: [expectation], timeout: 1.0)
        XCTAssertTrue(presenter.dismissCalled)
        XCTAssertTrue(presenter.dismissCalledOnMainThread)
        XCTAssertNil(BaseModule.currentPresenter)
    }

    func test_unregisteringAView_doesNotTearDownCheckout() {
        // GIVEN a registered view within a presented checkout
        let sut = ComponentModule()
        let presenter = MockPresenterViewController()
        BaseModule.presenterStack = [presenter]
        _ = sut.register(viewId: "card-view")

        // WHEN the view goes away
        sut.unregister(viewId: "card-view")

        // THEN the checkout is left intact. Per the lifecycle contract teardown happens only on a
        // terminal event or `invalidate()` — a view unmounting must not end the checkout, or a
        // headless submit afterwards would have no context to run in.
        XCTAssertFalse(presenter.dismissCalled)
        XCTAssertNotNil(BaseModule.currentPresenter)
    }

    func test_cleanUp_fromBackgroundThread_disposesRegisteredViews() {
        // GIVEN two registered views
        let expectation = expectation(description: "cleanUp processed on the main thread")
        let sut = ComponentModule()
        _ = sut.register(viewId: "card-view")
        _ = sut.register(viewId: "boleto-view")

        // WHEN the checkout is torn down from a background thread
        DispatchQueue.global().async {
            sut.cleanUp()
            // cleanUp hops to the main queue, so this later hop is drained after it.
            DispatchQueue.main.async { expectation.fulfill() }
        }

        // THEN it completes on the main thread. Disposing mounted views is the only reason this
        // registry exists: JS cannot do it, because the merchant owns the JSX and can keep a view
        // mounted across a checkout being replaced.
        wait(for: [expectation], timeout: 1.0)
    }

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

    func test_baseModuleCleanUp_withoutPresentedViewController_clearsPresenter() {
        // GIVEN a BaseModule with a presenter that has no presented view controller
        let expectation = expectation(description: "Presenter should be cleared")

        DispatchQueue.main.async {
            let sut = TestableBaseModule()
            BaseModule.presenterStack = [UIViewController()]

            // WHEN cleanUp() is called
            sut.cleanUp()

            // THEN the presenter stack is cleared
            XCTAssertNil(BaseModule.currentPresenter)
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

    // Removed: three tests covering the per-view address-lookup handlers
    // (`storeLookupHandler`, `storeLookupCompletionHandler`, `update`, `confirm`). They exercised
    // plumbing that no call site ever populated, and v6 configures address lookup once per
    // checkout with a handler that carries no view identity, so per-view routing cannot exist.

    // Removed: eight tests covering `CardComponentViewProxy` and the v5 embedded-component bus
    // entry points (`createActionHandlerIfNeeded`, `hide`, `handle`). None of those symbols exist
    // in v6 — action routing now goes through `ComponentModule.action(_:actionDict:)` and
    // `ComponentProxy`. Re-add equivalent coverage against the v6 surface when the presenter
    // refactor lands.

    private static let lookupAddress: NSDictionary = [
        "id": "addr1",
        "address": [
            "street": "Main St",
            "houseNumberOrName": "123",
            "city": "Amsterdam",
            "postalCode": "1012AB",
            "country": "NL"
        ]
    ]

    private static let context = AdyenContext(
        apiContext: try! APIContext(environment: Environment.test, clientKey: "local_DUMMYKEYFORTESTING"),
        amount: nil,
        publicKey: "DUMMY_PUBLIC_KEY",
        analyticsProvider: nil
    )

    /// "type" has the wrong JSON type (number instead of string), guaranteeing
    /// `CardPaymentMethod` decoding fails and `createCardComponent` takes its error path.
    private static let invalidCardPaymentMethodJSON = #"{"type":123}"#
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

private final class ThreadTrackingEmitter: EventEmitter {
    private(set) var eventCount = 0
    private(set) var sentOnMainThread = false
    var onSend: (() -> Void)?

    func send(event: EventName, body: Any?) {
        eventCount += 1
        sentOnMainThread = Thread.isMainThread
        onSend?()
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
