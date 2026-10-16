//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import UIKit

@objc public protocol AdyenComponentViewProxyDelegate: AnyObject {
    func onLayoutChange(width: CGFloat, height: CGFloat)
}

/// Backing UIKit view for a Fabric `<AdyenComponent>` bound to one registry controller.
///
/// The view never creates or disposes a controller: it embeds the controller's existing view
/// controller on attach and only detaches on unmount.
@objc(AdyenComponentViewProxy)
@MainActor
public final class AdyenComponentViewProxy: UIStackView {

    private var controller: ComponentProxy?
    private var componentViewController: UIViewController?
    private var componentView: UIView?
    private var lastReportedHeight: CGFloat = 0
    private var originalTranslatesAutoresizingMask = true
    private var originalScrollState: ScrollState?
    private var contentSizeObservation: NSKeyValueObservation?
    private let coordinator: CheckoutCoordinator

    @objc public weak var delegate: AdyenComponentViewProxyDelegate?

    @objc override public init(frame: CGRect) {
        coordinator = .shared
        super.init(frame: frame)
        clipsToBounds = false
    }

    internal init(frame: CGRect, coordinator: CheckoutCoordinator) {
        self.coordinator = coordinator
        super.init(frame: frame)
        clipsToBounds = false
    }

    @available(*, unavailable)
    required init(coder _: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    internal var boundControllerID: String? {
        controller?.controllerID
    }

    /// Fabric delivers the checkout and controller identities together. A changed pair releases
    /// the previous controller before binding the new one. Unknown, stale, or already-bound
    /// controllers leave the view empty.
    @objc public func updateBinding(checkoutID: String?, controllerID: String?) {
        guard let checkoutID, !checkoutID.isEmpty,
              let controllerID, !controllerID.isEmpty else {
            detach()
            return
        }
        if let controller, !controller.isDisposed,
           controller.checkoutID == checkoutID,
           controller.controllerID == controllerID {
            return
        }

        detach()
        guard let controller = try? coordinator.controller(checkoutID: checkoutID, controllerID: controllerID),
              (try? controller.bind(self)) != nil else {
            return
        }
        self.controller = controller
        if let viewController = controller.viewController {
            componentViewController = viewController
            embedComponentView(viewController)
        }
    }

    override public func layoutSubviews() {
        super.layoutSubviews()
        reportContentHeight()
    }

    /// Releases the binding without disposing the controller, which stays registered until its
    /// checkout is torn down and can be bound again by another view.
    @objc public func detach() {
        detachComponentViewController()
        guard let controller else { return }
        self.controller = nil
        if controller.unbind(self) {
            coordinator.controllerDidDetach(controller)
        }
    }

    // MARK: - View embedding

    private func detachComponentViewController() {
        if let childVC = componentViewController, childVC.view.superview === self {
            childVC.willMove(toParent: nil)
            removeArrangedSubview(childVC.view)
            childVC.view.removeFromSuperview()
            childVC.removeFromParent()
            restoreEmbeddingChanges(in: childVC.view)
        }
        contentSizeObservation = nil
        componentView = nil
        componentViewController = nil
        lastReportedHeight = 0
    }

    @MainActor
    private func embedComponentView(_ childVC: UIViewController) {
        _ = childVC.view // force load view

        if let parentVC = parentViewController {
            parentVC.addChild(childVC)
            childVC.didMove(toParent: parentVC)
        }

        componentView = childVC.view
        originalTranslatesAutoresizingMask = childVC.view.translatesAutoresizingMaskIntoConstraints
        addArrangedSubview(childVC.view)
        disableNativeScrollingAndBouncing(in: childVC.view)
        layoutIfNeeded()
    }

    private func disableNativeScrollingAndBouncing(in componentView: UIView) {
        guard let formView: UIScrollView = componentView.findSubview() else { return }
        originalScrollState = ScrollState(formView)
        formView.bounces = false
        formView.isScrollEnabled = false
        formView.alwaysBounceVertical = false
        formView.contentInsetAdjustmentBehavior = .never
        contentSizeObservation = formView.observe(\.contentSize, options: [.new]) { [weak self] _, _ in
            MainActor.assumeIsolated { self?.setNeedsLayout() }
        }
    }

    /// The controller outlives this view and its view controller can be presented on its own
    /// later (headless submit), where stack-view constraints and disabled scrolling would leave
    /// the form collapsed under the navigation bar.
    private func restoreEmbeddingChanges(in componentView: UIView) {
        componentView.translatesAutoresizingMaskIntoConstraints = originalTranslatesAutoresizingMask
        originalScrollState?.restore()
        originalScrollState = nil
    }

    private struct ScrollState {
        weak var scrollView: UIScrollView?
        let bounces: Bool
        let isScrollEnabled: Bool
        let alwaysBounceVertical: Bool
        let contentInsetAdjustmentBehavior: UIScrollView.ContentInsetAdjustmentBehavior

        @MainActor
        init(_ scrollView: UIScrollView) {
            self.scrollView = scrollView
            bounces = scrollView.bounces
            isScrollEnabled = scrollView.isScrollEnabled
            alwaysBounceVertical = scrollView.alwaysBounceVertical
            contentInsetAdjustmentBehavior = scrollView.contentInsetAdjustmentBehavior
        }

        @MainActor
        func restore() {
            guard let scrollView else { return }
            scrollView.bounces = bounces
            scrollView.isScrollEnabled = isScrollEnabled
            scrollView.alwaysBounceVertical = alwaysBounceVertical
            scrollView.contentInsetAdjustmentBehavior = contentInsetAdjustmentBehavior
        }
    }

    // MARK: - Layout reporting

    /// Some component view controllers (for example the stored card form) do not publish a
    /// `preferredContentSize`; their height then comes from the content of their scroll view.
    private var preferredContentSize: CGSize {
        let preferred = componentViewController?.preferredContentSize ?? .zero
        guard preferred.height <= 0, let scrollView = originalScrollState?.scrollView else {
            return preferred
        }
        scrollView.layoutIfNeeded()
        return CGSize(width: bounds.width, height: scrollView.contentSize.height)
    }

    private func reportContentHeight() {
        let size = preferredContentSize
        guard abs(size.height - lastReportedHeight) > 1 else { return }
        lastReportedHeight = size.height
        delegate?.onLayoutChange(width: size.width, height: size.height)
    }
}

extension AdyenComponentViewProxy: ControllerViewBinding {
    func controllerDidDispose(_ disposedController: ComponentProxy) {
        guard controller === disposedController else { return }
        controller = nil
        detachComponentViewController()
    }
}
