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

    func test_embeddedComponentBusUnsubscribe_fromBackgroundThread_doesNotTearDownCheckout() {
        // GIVEN a ComponentModule with a subscribed, presented view
        let expectation = expectation(description: "unsubscribe processed on the main thread")
        let sut = ComponentModule()
        let presenter = MockPresenterViewController()
        BaseModule.presenterStack = [presenter]

        sut.subscribe("card-view")

        // WHEN unsubscribe() is called from a background thread
        DispatchQueue.global().async {
            sut.unsubscribe("card-view")
            // unsubscribe hops to the main queue, so this later hop is drained after it.
            DispatchQueue.main.async { expectation.fulfill() }
        }

        wait(for: [expectation], timeout: 1.0)

        // THEN the checkout is left intact. Per the lifecycle contract teardown happens only on a
        // terminal event or `invalidate()` — a view unmounting must not end the checkout, or a
        // headless submit afterwards would have no context to run in.
        XCTAssertFalse(presenter.dismissCalled)
        XCTAssertNotNil(BaseModule.currentPresenter)
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

    func test_embeddedComponentBusUpdate_fromBackgroundThread_callsLookupHandlerOnMainThread() {
        // GIVEN an ComponentModule with a registered lookup handler
        let expectation = expectation(description: "Lookup handler should be called")
        let sut = ComponentModule()

        sut.storeLookupHandler(for: "card-view") { addresses in
            // THEN the handler is invoked on the main thread with the decoded addresses
            XCTAssertTrue(Thread.isMainThread)
            XCTAssertEqual(addresses.count, 1)
            XCTAssertEqual(addresses.first?.postalAddress.street, "Main St")
            expectation.fulfill()
        }

        // WHEN update() is called from a background thread
        DispatchQueue.global().async {
            sut.update("card-view", results: [Self.lookupAddress] as NSArray)
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func test_embeddedComponentBusConfirmSuccess_fromBackgroundThread_callsCompletionOnMainThread() {
        // GIVEN an ComponentModule with a registered completion handler
        let expectation = expectation(description: "Completion handler should receive success")
        let sut = ComponentModule()

        sut.storeLookupCompletionHandler(for: "card-view") { result in
            // THEN the handler is invoked on the main thread with a success result
            XCTAssertTrue(Thread.isMainThread)
            guard case let .success(address) = result else {
                return XCTFail("Expected success result")
            }
            XCTAssertEqual(address.street, "Main St")
            expectation.fulfill()
        }

        // WHEN confirm() is called with a successful address from a background thread
        DispatchQueue.global().async {
            sut.confirm("card-view", success: NSNumber(value: true), address: Self.lookupAddress)
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func test_embeddedComponentBusConfirmFailure_fromBackgroundThread_callsCompletionOnMainThread() {
        // GIVEN an ComponentModule with a registered completion handler
        let expectation = expectation(description: "Completion handler should receive failure")
        let sut = ComponentModule()

        sut.storeLookupCompletionHandler(for: "card-view") { result in
            // THEN the handler is invoked on the main thread with a failure result
            XCTAssertTrue(Thread.isMainThread)
            guard case let .failure(error) = result else {
                return XCTFail("Expected failure result")
            }
            XCTAssertEqual(error.localizedDescription, "Address not found")
            expectation.fulfill()
        }

        // WHEN confirm() is called with a failed address from a background thread
        DispatchQueue.global().async {
            sut.confirm(
                "card-view",
                success: NSNumber(value: false),
                address: ["message": "Address not found"]
            )
        }

        wait(for: [expectation], timeout: 1.0)
    }

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
