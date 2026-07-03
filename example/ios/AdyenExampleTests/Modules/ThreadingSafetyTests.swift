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
        BaseModule.presenterStack = [presenter]

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
        BaseModule.presenterStack = [presenter]

        sut.subscribe("card-view")

        DispatchQueue.global().async {
            sut.unsubscribe("card-view")
        }

        wait(for: [expectation], timeout: 1.0)
        XCTAssertTrue(presenter.dismissCalled)
        XCTAssertTrue(presenter.dismissCalledOnMainThread)
        XCTAssertNil(BaseModule.currentPresenter)
    }

    func test_ensureMainThread_runsImmediately_whenAlreadyOnMainThread() {
        let expectation = expectation(description: "Work should run immediately")

        DispatchQueue.main.async {
            var didRun = false

            ensureMainThread {
                didRun = true
                XCTAssertTrue(Thread.isMainThread)
            }

            XCTAssertTrue(didRun)
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func test_ensureMainThread_dispatchesWorkToMainThread_fromBackgroundThread() {
        let expectation = expectation(description: "Work should run on main thread")

        DispatchQueue.global().async {
            ensureMainThread {
                XCTAssertTrue(Thread.isMainThread)
                expectation.fulfill()
            }
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func test_baseModuleCleanUp_withoutPresentedViewController_clearsPresenter() {
        let expectation = expectation(description: "Presenter should be cleared")

        DispatchQueue.main.async {
            let sut = TestableBaseModule()
            BaseModule.presenterStack = [UIViewController()]

            sut.cleanUp()

            XCTAssertNil(BaseModule.currentPresenter)
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func test_embeddedComponentBusUpdate_fromBackgroundThread_callsLookupHandlerOnMainThread() {
        let expectation = expectation(description: "Lookup handler should be called")
        let sut = EmbeddedComponentBusModule()

        sut.storeLookupHandler(for: "card-view") { addresses in
            XCTAssertTrue(Thread.isMainThread)
            XCTAssertEqual(addresses.count, 1)
            XCTAssertEqual(addresses.first?.postalAddress.street, "Main St")
            expectation.fulfill()
        }

        DispatchQueue.global().async {
            sut.update("card-view", results: [Self.lookupAddress] as NSArray)
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func test_embeddedComponentBusConfirmSuccess_fromBackgroundThread_callsCompletionOnMainThread() {
        let expectation = expectation(description: "Completion handler should receive success")
        let sut = EmbeddedComponentBusModule()

        sut.storeLookupCompletionHandler(for: "card-view") { result in
            XCTAssertTrue(Thread.isMainThread)
            guard case let .success(address) = result else {
                return XCTFail("Expected success result")
            }
            XCTAssertEqual(address.street, "Main St")
            expectation.fulfill()
        }

        DispatchQueue.global().async {
            sut.confirm("card-view", success: NSNumber(value: true), address: Self.lookupAddress)
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func test_embeddedComponentBusConfirmFailure_fromBackgroundThread_callsCompletionOnMainThread() {
        let expectation = expectation(description: "Completion handler should receive failure")
        let sut = EmbeddedComponentBusModule()

        sut.storeLookupCompletionHandler(for: "card-view") { result in
            XCTAssertTrue(Thread.isMainThread)
            guard case let .failure(error) = result else {
                return XCTFail("Expected failure result")
            }
            XCTAssertEqual(error.localizedDescription, "Address not found")
            expectation.fulfill()
        }

        DispatchQueue.global().async {
            sut.confirm(
                "card-view",
                success: NSNumber(value: false),
                address: ["message": "Address not found"]
            )
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func test_embeddedComponentBusHide_fromBackgroundThread_dismissesPresenterOnMainThread() {
        let expectation = expectation(description: "Presenter should be dismissed")
        let sut = EmbeddedComponentBusModule()
        let presenter = MockPresenterViewController()
        presenter.onDismiss = {
            expectation.fulfill()
        }
        BaseModule.presenterStack = [presenter]

        _ = sut.register(viewId: "card-view")

        DispatchQueue.global().async {
            sut.hide("card-view", success: NSNumber(value: true), event: [:])
        }

        wait(for: [expectation], timeout: 1.0)
        XCTAssertTrue(presenter.dismissCalled)
        XCTAssertTrue(presenter.dismissCalledOnMainThread)
        XCTAssertNil(BaseModule.currentPresenter)
    }

    func test_embeddedComponentBusHandle_withNilAction_doesNotEmitError() {
        let expectation = expectation(description: "No error should be emitted")
        let sut = EmbeddedComponentBusModule()
        let emitter = MockEmitter()
        sut.emitterOverride = emitter

        DispatchQueue.global().async {
            sut.handle("card-view", action: nil)
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertEqual(emitter.events.count, 0)
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func test_embeddedComponentBusHandle_withoutActionHandler_emitsError() {
        let expectation = expectation(description: "Error should be emitted")
        let sut = EmbeddedComponentBusModule()
        let emitter = MockEmitter()
        sut.emitterOverride = emitter

        DispatchQueue.global().async {
            sut.handle("card-view", action: [:])
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertEqual(emitter.eventCount(named: EventName.fail.rawValue), 1)
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func test_embeddedComponentBusHandle_withoutRegisteredProxy_emitsError() {
        let expectation = expectation(description: "Error should be emitted")
        let sut = EmbeddedComponentBusModule()
        let emitter = MockEmitter()
        sut.emitterOverride = emitter
        sut.createActionHandlerIfNeeded(context: Self.context, locale: nil)

        DispatchQueue.global().async {
            sut.handle("card-view", action: [:])
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            XCTAssertEqual(emitter.eventCount(named: EventName.fail.rawValue), 1)
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func test_embeddedComponentBusHandle_withInvalidAction_emitsError() {
        let expectation = expectation(description: "Invalid action error should be emitted")
        let sut = EmbeddedComponentBusModule()
        let emitter = MockEmitter()
        sut.emitterOverride = emitter
        sut.createActionHandlerIfNeeded(context: Self.context, locale: nil)
        _ = sut.register(viewId: "card-view")

        DispatchQueue.global().async {
            sut.handle("card-view", action: [:])
        }

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
