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

    private var sut: BaseModuleSender!

    override func setUp() {
        super.setUp()
        sut = BaseModuleSender()
    }

    override func tearDown() {
        sut = nil
        BaseModule.presenterStack.removeAll()
        BaseModule.currentModule = nil
        BaseModule.session = nil
        BaseModule.topPresenterProvider = { UIViewController.topPresenter }
        super.tearDown()
    }

    // MARK: - presenterStack / currentPresenter

    func test_currentPresenter_isNil_whenStackIsEmpty() {
        // GIVEN
        XCTAssertTrue(BaseModule.presenterStack.isEmpty)

        // THEN
        XCTAssertNil(BaseModule.currentPresenter)
    }

    func test_currentPresenter_returnsSingleEntry() {
        // GIVEN
        let vc = UIViewController()
        BaseModule.presenterStack = [vc]

        // THEN
        XCTAssertTrue(BaseModule.currentPresenter === vc)
    }

    func test_currentPresenter_returnsLastEntry_withMultipleVCs() {
        // GIVEN
        let first = UIViewController()
        let last = UIViewController()
        BaseModule.presenterStack = [first, UIViewController(), last]

        // THEN
        XCTAssertTrue(BaseModule.currentPresenter === last)
    }

    // MARK: - cleanUp — presenterStack state

    func test_cleanUp_withEmptyStack_doesNotCrash() {
        // GIVEN
        let exp = expectation(description: "cleanUp on main thread")
        BaseModule.presenterStack = []

        // WHEN
        DispatchQueue.main.async {
            self.sut.cleanUp()
            exp.fulfill()
        }

        // THEN
        wait(for: [exp], timeout: 1.0)
        XCTAssertTrue(BaseModule.presenterStack.isEmpty)
    }

    func test_cleanUp_clearsEntireStack() {
        // GIVEN
        let exp = expectation(description: "cleanUp on main thread")
        BaseModule.presenterStack = [UIViewController(), UIViewController(), UIViewController()]

        // WHEN
        DispatchQueue.main.async {
            self.sut.cleanUp()
            exp.fulfill()
        }

        // THEN
        wait(for: [exp], timeout: 1.0)
        XCTAssertTrue(BaseModule.presenterStack.isEmpty)
    }

    /// Verifies the linked-list dismissal: only presenterStack.first receives `dismiss`.
    func test_cleanUp_withMultipleVCsInStack_dismissesOnlyFirstVC() {
        // GIVEN
        let exp = expectation(description: "first VC dismissed")
        let rootMock = makeMockDismissableVC(onDismiss: exp.fulfill())
        let paymentMock = makeMockDismissableVC()
        BaseModule.presenterStack = [rootMock, paymentMock]

        // WHEN
        DispatchQueue.main.async {
            self.sut.cleanUp()
        }

        // THEN
        wait(for: [exp], timeout: 1.0)
        XCTAssertTrue(rootMock.dismissCalled, "Root (first) VC should be dismissed")
        XCTAssertFalse(paymentMock.dismissCalled, "Payment (last) VC should NOT be dismissed directly")
        XCTAssertTrue(BaseModule.presenterStack.isEmpty)
    }

    // MARK: - cleanUp — static state

    func test_cleanUp_clearsCurrentModule() {
        // GIVEN
        let exp = expectation(description: "cleanUp completes")
        BaseModule.currentModule = sut

        // WHEN
        DispatchQueue.main.async {
            self.sut.cleanUp()
            exp.fulfill()
        }

        // THEN
        wait(for: [exp], timeout: 1.0)
        XCTAssertNil(BaseModule.currentModule)
    }

    func test_cleanUp_clearsCurrentComponent() {
        // GIVEN
        let exp = expectation(description: "cleanUp completes")
        sut.currentComponent = MockComponent()

        // WHEN
        DispatchQueue.main.async {
            self.sut.cleanUp()
            exp.fulfill()
        }

        // THEN
        wait(for: [exp], timeout: 1.0)
        XCTAssertNil(sut.currentComponent)
    }

    // MARK: - dismiss

    func test_dismiss_withNoCurrentComponent_callsCleanUp() {
        // GIVEN
        let exp = expectation(description: "dismiss completes")
        BaseModule.currentModule = sut

        // WHEN
        DispatchQueue.global().async {
            self.sut.dismiss(false)
            DispatchQueue.main.async { exp.fulfill() }
        }

        // THEN
        wait(for: [exp], timeout: 1.0)
        XCTAssertNil(BaseModule.currentModule)
    }

    // MARK: - checkErrorType

    func test_checkErrorType_componentCancelled_returnsCanceled() {
        // WHEN
        let result = sut.checkErrorType(ComponentError.cancelled)

        // THEN
        XCTAssertEqual((result as? KnownError)?.errorCode, "canceledByShopper")
    }

    func test_checkErrorType_otherError_returnsOriginalError() {
        // GIVEN
        let original = NSError(domain: "test.domain", code: 42)

        // WHEN
        let result = sut.checkErrorType(original)

        // THEN
        XCTAssertTrue((result as NSError) === original)
    }

    // MARK: - hide

    func test_hide_success_callsDismiss_andClearsState() {
        // GIVEN
        let exp = expectation(description: "hide clears state")
        let rootMock = makeMockDismissableVC(onDismiss: exp.fulfill())
        BaseModule.presenterStack = [rootMock]

        // WHEN
        DispatchQueue.main.async {
            self.sut.hide(NSNumber(value: true), event: [:])
        }

        // THEN
        wait(for: [exp], timeout: 1.0)
        XCTAssertTrue(rootMock.dismissCalled)
        XCTAssertTrue(BaseModule.presenterStack.isEmpty)
    }

    func test_hide_withEmptyStack_doesNotCrash() {
        // GIVEN
        let exp = expectation(description: "hide completes without crash")

        // WHEN
        DispatchQueue.main.async {
            self.sut.hide(NSNumber(value: false), event: [:])
            DispatchQueue.main.async { exp.fulfill() }
        }

        // THEN
        wait(for: [exp], timeout: 1.0)
    }

    // MARK: - present(component:) via PresentationDelegate

    func test_present_requiresModal_wrapsComponentInNavigationController() {
        // GIVEN
        let exp = expectation(description: "presenter.present called")
        let mockPresenter = makeMockPresenter(onPresent: { _ in exp.fulfill() })
        let mockComponent = makeMockComponent(requiresModalPresentation: true)
        BaseModule.presenterStack = [mockPresenter]

        // WHEN
        sut.present(component: mockComponent)

        // THEN
        wait(for: [exp], timeout: 1.0)
        XCTAssertTrue(mockPresenter.lastPresentedViewController is UINavigationController)
        let nav = mockPresenter.lastPresentedViewController as? UINavigationController
        XCTAssertTrue(nav?.viewControllers.first === mockComponent.viewController)
    }

    func test_present_requiresModal_addsRightCancelBarButton() {
        // GIVEN
        let exp = expectation(description: "presenter.present called")
        let mockPresenter = makeMockPresenter(onPresent: { _ in exp.fulfill() })
        let mockComponent = makeMockComponent(requiresModalPresentation: true)
        BaseModule.presenterStack = [mockPresenter]

        // WHEN
        sut.present(component: mockComponent)

        // THEN
        wait(for: [exp], timeout: 1.0)
        XCTAssertNotNil(mockComponent.viewController.navigationItem.rightBarButtonItem)
    }

    func test_present_noModalRequired_presentsComponentViewControllerDirectly() {
        // GIVEN
        let exp = expectation(description: "presenter.present called")
        let mockPresenter = makeMockPresenter(onPresent: { _ in exp.fulfill() })
        let mockComponent = makeMockComponent(requiresModalPresentation: false)
        BaseModule.presenterStack = [mockPresenter]

        // WHEN
        sut.present(component: mockComponent)

        // THEN
        wait(for: [exp], timeout: 1.0)
        XCTAssertTrue(mockPresenter.lastPresentedViewController === mockComponent.viewController)
    }

    func test_present_appendsPresentedViewControllerToStack() {
        // GIVEN
        let exp = expectation(description: "stack updated")
        let mockPresenter = makeMockPresenter(onPresent: { _ in exp.fulfill() })
        let mockComponent = makeMockComponent(requiresModalPresentation: false)
        BaseModule.presenterStack = [mockPresenter]

        // WHEN
        sut.present(component: mockComponent)

        // THEN
        wait(for: [exp], timeout: 1.0)
        XCTAssertEqual(BaseModule.presenterStack.count, 2)
        XCTAssertTrue(BaseModule.presenterStack.first === mockPresenter)
        XCTAssertTrue(BaseModule.presenterStack.last === mockComponent.viewController)
    }

    func test_present_setsCurrentModule() {
        // GIVEN
        let exp = expectation(description: "present dispatched")
        let mockPresenter = makeMockPresenter(onPresent: { _ in exp.fulfill() })
        BaseModule.presenterStack = [mockPresenter]

        // WHEN
        sut.present(component: makeMockComponent(requiresModalPresentation: false))

        // THEN
        wait(for: [exp], timeout: 1.0)
        XCTAssertTrue(BaseModule.currentModule === sut)
    }

    func test_present_withEmptyStack_usesTopPresenterProvider() {
        // GIVEN
        let exp = expectation(description: "topPresenter used when stack is empty")
        let injectedPresenter = makeMockPresenter(onPresent: { _ in exp.fulfill() })
        BaseModule.presenterStack = []
        BaseModule.topPresenterProvider = { injectedPresenter }

        // WHEN
        sut.present(component: makeMockComponent(requiresModalPresentation: false))

        // THEN
        wait(for: [exp], timeout: 1.0)
        XCTAssertTrue(injectedPresenter.presentCalled)
        // topPresenter itself is pushed as the first stack entry, then the presented VC
        XCTAssertEqual(BaseModule.presenterStack.count, 2)
        XCTAssertTrue(BaseModule.presenterStack.first === injectedPresenter)
    }

    func test_present_withNoPresenterAndNoTopPresenter_sendsNotKeyWindowError() {
        // GIVEN
        let exp = expectation(description: "error sent")
        let mockEmitter = MockEmitter()
        sut.emitterOverride = mockEmitter
        BaseModule.presenterStack = []
        BaseModule.topPresenterProvider = { nil }

        // WHEN
        sut.present(component: makeMockComponent(requiresModalPresentation: false))

        // THEN
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { exp.fulfill() }
        wait(for: [exp], timeout: 1.0)
        XCTAssertEqual(mockEmitter.eventCount(named: EventName.fail.rawValue), 1)
    }

    func test_present_usesCurrentPresenter_fromStack() {
        // GIVEN
        let exp = expectation(description: "correct presenter used")
        let firstPresenter = makeMockPresenter()
        let secondPresenter = makeMockPresenter(onPresent: { _ in exp.fulfill() })
        BaseModule.presenterStack = [firstPresenter, secondPresenter]

        // WHEN
        sut.present(component: makeMockComponent(requiresModalPresentation: false))

        // THEN
        wait(for: [exp], timeout: 1.0)
        XCTAssertFalse(firstPresenter.presentCalled, "First VC should not be used as presenter")
        XCTAssertTrue(secondPresenter.presentCalled, "Last (current) VC should be used as presenter")
    }

    // MARK: - Helpers

    private func makeMockPresenter(onPresent: ((UIViewController) -> Void)? = nil) -> MockPresentingViewController {
        let presenter = MockPresentingViewController()
        presenter.onPresent = onPresent
        return presenter
    }

    private func makeMockComponent(requiresModalPresentation: Bool) -> MockPresentableComponent {
        MockPresentableComponent(requiresModalPresentation: requiresModalPresentation)
    }

    private func makeMockDismissableVC(onDismiss: (() -> Void)? = nil) -> MockDismissableViewController {
        let vc = MockDismissableViewController()
        vc.onDismiss = onDismiss
        return vc
    }
}

// MARK: - Mocks

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
