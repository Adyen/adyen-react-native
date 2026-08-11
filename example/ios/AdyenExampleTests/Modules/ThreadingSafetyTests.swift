//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

@_spi(AdyenInternal) import Adyen
@testable import adyen_react_native
import UIKit
import XCTest

final class ThreadingSafetyTests: XCTestCase {

    override func tearDown() {
        BaseModule.presenterStack.removeAll()
        BaseModule.currentModule = nil
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

    func test_embeddedComponentBusUnsubscribe_fromBackgroundThread_dismissesPresenterOnMainThread() {
        // GIVEN an ComponentModule with a subscribed, presented view
        let expectation = expectation(description: "Presenter should be dismissed")
        let sut = ComponentModule()
        let presenter = MockPresenterViewController()
        presenter.onDismiss = {
            expectation.fulfill()
        }
        BaseModule.presenterStack = [presenter]

        sut.subscribe("card-view")

        // WHEN unsubscribe() is called from a background thread
        DispatchQueue.global().async {
            sut.unsubscribe("card-view")
        }

        // THEN the presenter is dismissed on the main thread
        wait(for: [expectation], timeout: 1.0)
        XCTAssertTrue(presenter.dismissCalled)
        XCTAssertTrue(presenter.dismissCalledOnMainThread)
        XCTAssertNil(BaseModule.currentPresenter)
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

    func test_cardComponentViewProxyDispose_fromBackgroundThread_doesNotCrash() {
        // GIVEN a CardComponentViewProxy registered with the component bus
        let bus = ComponentModule()
        ComponentModule.shared = bus
        bus.createActionHandlerIfNeeded(context: Self.context, locale: nil)
        _ = bus.register(viewId: "card-view")

        let proxy = CardComponentViewProxy(frame: .zero)
        proxy.viewId = "card-view"

        // WHEN dispose() is called from a background thread
        let disposeExpectation = expectation(description: "Dispose should complete")
        DispatchQueue.global().async {
            proxy.dispose()
            DispatchQueue.main.async {
                disposeExpectation.fulfill()
            }
        }

        // THEN dispose completes without crashing and the bus state is not corrupted
        wait(for: [disposeExpectation], timeout: 1.0)

        let newProxy = bus.register(viewId: "card-view-2")
        XCTAssertNotNil(newProxy)
    }

    func test_cardComponentViewProxyInitialize_fromBackgroundThread_reportsErrorOnMainThread() {
        // GIVEN a CardComponentViewProxy that will fail to decode its payment method
        let bus = ComponentModule()
        ComponentModule.shared = bus
        let emitter = ThreadTrackingEmitter()
        bus.emitterOverride = emitter

        let proxy = CardComponentViewProxy(frame: .zero)
        proxy.viewId = "card-view"

        let expectation = expectation(description: "Error should be reported on main thread")
        // Each failed attempt resets `hasComponent`, so both setters can independently
        // re-trigger initialization; both emissions call fulfill(), so over-fulfillment is expected.
        expectation.assertForOverFulfill = false
        emitter.onSend = {
            expectation.fulfill()
        }

        // WHEN the payment method and configuration are set from a background thread
        DispatchQueue.global().async {
            proxy.setPaymentMethod(Self.invalidCardPaymentMethodJSON)
            proxy.setConfiguration("{}")
        }

        // THEN the resulting error is emitted on the main thread
        wait(for: [expectation], timeout: 1.0)
        XCTAssertGreaterThanOrEqual(emitter.eventCount, 1)
        XCTAssertTrue(emitter.sentOnMainThread)
    }

    func test_embeddedComponentBusHide_fromBackgroundThread_dismissesPresenterOnMainThread() {
        // GIVEN an ComponentModule with a registered, presented view
        let expectation = expectation(description: "Presenter should be dismissed")
        let sut = ComponentModule()
        let presenter = MockPresenterViewController()
        presenter.onDismiss = {
            expectation.fulfill()
        }
        BaseModule.presenterStack = [presenter]

        _ = sut.register(viewId: "card-view")

        // WHEN hide() is called from a background thread
        DispatchQueue.global().async {
            sut.hide("card-view", success: NSNumber(value: true), event: [:])
        }

        // THEN the presenter is dismissed on the main thread
        wait(for: [expectation], timeout: 1.0)
        XCTAssertTrue(presenter.dismissCalled)
        XCTAssertTrue(presenter.dismissCalledOnMainThread)
        XCTAssertNil(BaseModule.currentPresenter)
    }

    func test_embeddedComponentBusHandle_withNilAction_doesNotEmitError() {
        // GIVEN an ComponentModule with a mock emitter
        let expectation = expectation(description: "No error should be emitted")
        let sut = ComponentModule()
        let emitter = MockEmitter()
        sut.emitterOverride = emitter

        // WHEN handle() is called with a nil action from a background thread
        DispatchQueue.global().async {
            sut.handle("card-view", action: nil)
        }

        // THEN no error event is emitted
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertEqual(emitter.events.count, 0)
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func test_embeddedComponentBusHandle_withoutActionHandler_emitsError() {
        // GIVEN an ComponentModule without an action handler set up
        let expectation = expectation(description: "Error should be emitted")
        let sut = ComponentModule()
        let emitter = MockEmitter()
        sut.emitterOverride = emitter

        // WHEN handle() is called from a background thread
        DispatchQueue.global().async {
            sut.handle("card-view", action: [:])
        }

        // THEN a failure event is emitted
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertEqual(emitter.eventCount(named: EventName.fail.rawValue), 1)
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func test_embeddedComponentBusHandle_withoutRegisteredProxy_emitsError() {
        // GIVEN an ComponentModule with an action handler but no registered proxy
        let expectation = expectation(description: "Error should be emitted")
        let sut = ComponentModule()
        let emitter = MockEmitter()
        sut.emitterOverride = emitter
        sut.createActionHandlerIfNeeded(context: Self.context, locale: nil)

        // WHEN handle() is called from a background thread
        DispatchQueue.global().async {
            sut.handle("card-view", action: [:])
        }

        // THEN a failure event is emitted
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertEqual(emitter.eventCount(named: EventName.fail.rawValue), 1)
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func test_embeddedComponentBusHandle_withInvalidAction_emitsError() {
        // GIVEN an ComponentModule with a registered proxy and an invalid action
        let expectation = expectation(description: "Invalid action error should be emitted")
        let sut = ComponentModule()
        let emitter = MockEmitter()
        sut.emitterOverride = emitter
        sut.createActionHandlerIfNeeded(context: Self.context, locale: nil)
        _ = sut.register(viewId: "card-view")

        // WHEN handle() is called from a background thread
        DispatchQueue.global().async {
            sut.handle("card-view", action: [:])
        }

        // THEN a failure event is emitted
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertEqual(emitter.eventCount(named: EventName.fail.rawValue), 1)
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

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
        payment: nil
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
