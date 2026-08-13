//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import XCTest
@_spi(AdyenInternal) import Adyen
@testable import adyen_react_native
import UIKit

final class BaseModuleTests: XCTestCase {

    private var sut: TestableModule!

    override func setUp() {
        super.setUp()
        sut = TestableModule()
    }

    override func tearDown() {
        sut = nil
        BaseModule.presenterStack.removeAll()
        BaseModule.topPresenterProvider = { UIViewController.topPresenter }
        super.tearDown()
    }

    // MARK: - presenterStack / currentPresenter

    func test_currentPresenter_isNil_whenStackIsEmpty() {
        XCTAssertTrue(BaseModule.presenterStack.isEmpty)
        XCTAssertNil(BaseModule.currentPresenter)
    }

    func test_currentPresenter_returnsSingleEntry() {
        let vc = UIViewController()
        BaseModule.presenterStack = [vc]
        XCTAssertTrue(BaseModule.currentPresenter === vc)
    }

    func test_currentPresenter_returnsLastEntry_withMultipleVCs() {
        let first = UIViewController()
        let last = UIViewController()
        BaseModule.presenterStack = [first, UIViewController(), last]
        XCTAssertTrue(BaseModule.currentPresenter === last)
    }

    // MARK: - cleanUp — presenterStack state

    func test_cleanUp_withEmptyStack_doesNotCrash() {
        let exp = expectation(description: "cleanUp on main thread")
        BaseModule.presenterStack = []

        DispatchQueue.main.async {
            self.sut.cleanUp()
            exp.fulfill()
        }

        wait(for: [exp], timeout: 1.0)
        XCTAssertTrue(BaseModule.presenterStack.isEmpty)
    }

    func test_cleanUp_clearsEntireStack() {
        let exp = expectation(description: "cleanUp on main thread")
        BaseModule.presenterStack = [UIViewController(), UIViewController(), UIViewController()]

        DispatchQueue.main.async {
            self.sut.cleanUp()
            exp.fulfill()
        }

        wait(for: [exp], timeout: 1.0)
        XCTAssertTrue(BaseModule.presenterStack.isEmpty)
    }

    /// Verifies the linked-list dismissal: only presenterStack.first receives `dismiss`.
    func test_cleanUp_withMultipleVCsInStack_dismissesOnlyFirstVC() {
        let exp = expectation(description: "first VC dismissed")
        let rootMock = MockDismissableViewController()
        let paymentMock = MockDismissableViewController()
        rootMock.onDismiss = { exp.fulfill() }
        BaseModule.presenterStack = [rootMock, paymentMock]

        DispatchQueue.main.async {
            self.sut.cleanUp()
        }

        wait(for: [exp], timeout: 1.0)
        XCTAssertTrue(rootMock.dismissCalled, "Root (first) VC should be dismissed")
        XCTAssertFalse(paymentMock.dismissCalled, "Payment (last) VC should NOT be dismissed directly")
        XCTAssertTrue(BaseModule.presenterStack.isEmpty)
    }

    // MARK: - cleanUp — static state

    func test_cleanUp_clearsCurrentComponent() {
        let exp = expectation(description: "cleanUp completes")
        sut.currentComponent = MockComponent()

        DispatchQueue.main.async {
            self.sut.cleanUp()
            exp.fulfill()
        }

        wait(for: [exp], timeout: 1.0)
        XCTAssertNil(sut.currentComponent)
    }

    // MARK: - dismiss

    func test_dismiss_withNoCurrentComponent_callsCleanUp() {
        let exp = expectation(description: "dismiss completes")

        DispatchQueue.global().async {
            self.sut.dismiss(false)
            DispatchQueue.main.async { exp.fulfill() }
        }

        wait(for: [exp], timeout: 1.0)
        XCTAssertTrue(BaseModule.presenterStack.isEmpty)
    }

    // MARK: - checkErrorType

    func test_checkErrorType_componentCancelled_returnsCanceled() {
        let result = sut.checkErrorType(ComponentError.cancelled)
        XCTAssertEqual((result as? KnownError)?.errorCode, "canceledByShopper")
    }

    func test_checkErrorType_otherError_returnsOriginalError() {
        let original = NSError(domain: "test.domain", code: 42)
        let result = sut.checkErrorType(original)
        XCTAssertTrue((result as NSError) === original)
    }

    // MARK: - hide

    func test_hide_success_callsDismiss_andClearsState() {
        let exp = expectation(description: "hide clears state")
        let rootMock = MockDismissableViewController()
        rootMock.onDismiss = { exp.fulfill() }
        BaseModule.presenterStack = [rootMock]

        DispatchQueue.main.async {
            self.sut.hide(NSNumber(value: true), event: [:])
        }

        wait(for: [exp], timeout: 1.0)
        XCTAssertTrue(rootMock.dismissCalled)
        XCTAssertTrue(BaseModule.presenterStack.isEmpty)
    }

    func test_hide_withEmptyStack_doesNotCrash() {
        let exp = expectation(description: "hide completes without crash")

        DispatchQueue.main.async {
            self.sut.hide(NSNumber(value: false), event: [:])
            DispatchQueue.main.async { exp.fulfill() }
        }

        wait(for: [exp], timeout: 1.0)
    }

    // MARK: - present(component:) via PresentationDelegate

    func test_present_requiresModal_wrapsComponentInNavigationController() {
        let exp = expectation(description: "presenter.present called")
        let mockPresenter = MockPresentingViewController()
        mockPresenter.onPresent = { _ in exp.fulfill() }
        let mockComponent = MockPresentableComponent(requiresModalPresentation: true)
        BaseModule.presenterStack = [mockPresenter]

        sut.present(component: mockComponent)

        wait(for: [exp], timeout: 1.0)
        XCTAssertTrue(mockPresenter.lastPresentedViewController is UINavigationController)
        let nav = mockPresenter.lastPresentedViewController as? UINavigationController
        XCTAssertTrue(nav?.viewControllers.first === mockComponent.viewController)
    }

    func test_present_requiresModal_addsRightCancelBarButton() {
        let exp = expectation(description: "presenter.present called")
        let mockPresenter = MockPresentingViewController()
        mockPresenter.onPresent = { _ in exp.fulfill() }
        let mockComponent = MockPresentableComponent(requiresModalPresentation: true)
        BaseModule.presenterStack = [mockPresenter]

        sut.present(component: mockComponent)

        wait(for: [exp], timeout: 1.0)
        XCTAssertNotNil(mockComponent.viewController.navigationItem.rightBarButtonItem)
    }

    func test_present_noModalRequired_presentsComponentViewControllerDirectly() {
        let exp = expectation(description: "presenter.present called")
        let mockPresenter = MockPresentingViewController()
        mockPresenter.onPresent = { _ in exp.fulfill() }
        let mockComponent = MockPresentableComponent(requiresModalPresentation: false)
        BaseModule.presenterStack = [mockPresenter]

        sut.present(component: mockComponent)

        wait(for: [exp], timeout: 1.0)
        XCTAssertTrue(mockPresenter.lastPresentedViewController === mockComponent.viewController)
    }

    func test_present_appendsPresentedViewControllerToStack() {
        let exp = expectation(description: "stack updated")
        let mockPresenter = MockPresentingViewController()
        mockPresenter.onPresent = { _ in exp.fulfill() }
        let mockComponent = MockPresentableComponent(requiresModalPresentation: false)
        BaseModule.presenterStack = [mockPresenter]

        sut.present(component: mockComponent)

        wait(for: [exp], timeout: 1.0)
        XCTAssertEqual(BaseModule.presenterStack.count, 2)
        XCTAssertTrue(BaseModule.presenterStack.first === mockPresenter)
        XCTAssertTrue(BaseModule.presenterStack.last === mockComponent.viewController)
    }

    func test_present_appendsToPresenterStack() {
        let exp = expectation(description: "present dispatched")
        let mockPresenter = MockPresentingViewController()
        mockPresenter.onPresent = { _ in exp.fulfill() }
        BaseModule.presenterStack = [mockPresenter]

        sut.present(component: MockPresentableComponent(requiresModalPresentation: false))

        wait(for: [exp], timeout: 1.0)
        XCTAssertEqual(BaseModule.presenterStack.count, 2)
    }

    func test_present_withEmptyStack_usesTopPresenterProvider() {
        let exp = expectation(description: "topPresenter used when stack is empty")
        let injectedPresenter = MockPresentingViewController()
        injectedPresenter.onPresent = { _ in exp.fulfill() }
        // Stack is empty → falls through to topPresenterProvider
        BaseModule.presenterStack = []
        BaseModule.topPresenterProvider = { injectedPresenter }

        sut.present(component: MockPresentableComponent(requiresModalPresentation: false))

        wait(for: [exp], timeout: 1.0)
        XCTAssertTrue(injectedPresenter.presentCalled)
        // topPresenter itself is pushed as the first stack entry, then the presented VC
        XCTAssertEqual(BaseModule.presenterStack.count, 2)
        XCTAssertTrue(BaseModule.presenterStack.first === injectedPresenter)
    }

    func test_present_withNoPresenterAndNoTopPresenter_sendsNotKeyWindowError() {
        let exp = expectation(description: "error sent")
        let mockEmitter = MockEmitter()
        sut.emitterOverride = mockEmitter
        BaseModule.presenterStack = []
        BaseModule.topPresenterProvider = { nil }

        sut.present(component: MockPresentableComponent(requiresModalPresentation: false))

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { exp.fulfill() }
        wait(for: [exp], timeout: 1.0)
        XCTAssertEqual(mockEmitter.eventCount(named: EventName.fail.rawValue), 1)
    }

    func test_present_usesCurrentPresenter_fromStack() {
        let exp = expectation(description: "correct presenter used")
        let firstPresenter = MockPresentingViewController()
        let secondPresenter = MockPresentingViewController()
        secondPresenter.onPresent = { _ in exp.fulfill() }
        // secondPresenter is last → currentPresenter
        BaseModule.presenterStack = [firstPresenter, secondPresenter]

        sut.present(component: MockPresentableComponent(requiresModalPresentation: false))

        wait(for: [exp], timeout: 1.0)
        XCTAssertFalse(firstPresenter.presentCalled, "First VC should not be used as presenter")
        XCTAssertTrue(secondPresenter.presentCalled, "Last (current) VC should be used as presenter")
    }
}

// MARK: - Helpers

private final class TestableModule: BaseModuleSender {
    override init() {
        super.init()
    }

    @available(*, unavailable) required init?(coder: NSCoder) {
        fatalError()
    }
}

private final class MockDismissableViewController: UIViewController {
    var dismissCalled = false
    var onDismiss: (() -> Void)?

    private var _presentedVC: UIViewController? = UIViewController()
    override var presentedViewController: UIViewController? {
        _presentedVC
    }

    override func dismiss(animated flag: Bool, completion: (() -> Void)? = nil) {
        dismissCalled = true
        _presentedVC = nil
        completion?()
        onDismiss?()
    }
}

private final class MockComponent: Component {
    var context: AdyenContext = .init(
        apiContext: try! APIContext(environment: Environment.test, clientKey: "local_DUMMYKEYFORTESTING"),
        payment: nil
    )
}

private final class MockPresentingViewController: UIViewController {
    var presentCalled = false
    var lastPresentedViewController: UIViewController?
    var onPresent: ((UIViewController) -> Void)?

    override func present(_ viewControllerToPresent: UIViewController, animated flag: Bool, completion: (() -> Void)? = nil) {
        presentCalled = true
        lastPresentedViewController = viewControllerToPresent
        completion?()
        onPresent?(viewControllerToPresent)
    }
}

private final class MockPresentableComponent: PresentableComponent {
    var context: AdyenContext = .init(
        apiContext: try! APIContext(environment: Environment.test, clientKey: "local_DUMMYKEYFORTESTING"),
        payment: nil
    )
    let viewController = UIViewController()
    let requiresModalPresentation: Bool

    init(requiresModalPresentation: Bool) {
        self.requiresModalPresentation = requiresModalPresentation
    }
}
