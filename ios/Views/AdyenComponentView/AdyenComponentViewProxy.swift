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

/// Backing UIKit view for an identity-bound Fabric `<AdyenComponent>` registration.
@objc(AdyenComponentViewProxy)
@MainActor
public final class AdyenComponentViewProxy: UIStackView {

    private var controller: ComponentProxy?
    private var componentViewController: UIViewController?
    private var componentView: UIView?
    private var lastReportedHeight: CGFloat = 0
    private var creationGeneration = 0

    @objc public weak var delegate: AdyenComponentViewProxyDelegate?

    @objc override public init(frame: CGRect) {
        super.init(frame: frame)
        clipsToBounds = false
    }

    @available(*, unavailable)
    required init(coder _: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    /// Fabric updates the complete binding as one tuple. Disposing first prevents an old
    /// checkout/target controller from surviving long enough to attach after replacement.
    @objc public func updateRegistration(
        checkoutID: String?,
        presenterID: String?,
        targetKind: String?,
        targetValue: String?
    ) {
        guard let checkoutID, !checkoutID.isEmpty,
              let presenterID, !presenterID.isEmpty,
              let targetKind,
              let targetValue, !targetValue.isEmpty,
              let target = makeTarget(kind: targetKind, value: targetValue) else {
            dispose()
            return
        }

        if let controller, controller.matches(
            checkoutID: checkoutID,
            presenterID: presenterID,
            target: target
        ) {
            return
        }

        dispose()
        let controller = ComponentProxy(
            checkoutID: checkoutID,
            presenterID: presenterID,
            target: target
        )
        do {
            try CheckoutCoordinator.shared.registerPassivePresenter(
                checkoutID: checkoutID,
                presenterID: presenterID,
                target: target,
                presenter: controller
            )
        } catch {
            controller.dispose()
            return
        }
        self.controller = controller
        creationGeneration += 1
        let generation = creationGeneration
        createComponentView(controller, generation: generation)
    }

    override public func layoutSubviews() {
        super.layoutSubviews()
        reportContentHeight()
    }

    @objc public func dispose() {
        creationGeneration += 1
        if let childVC = componentViewController {
            childVC.willMove(toParent: nil)
            childVC.view.removeFromSuperview()
            childVC.removeFromParent()
        }
        componentView = nil
        componentViewController = nil
        lastReportedHeight = 0
        let controller = controller
        self.controller = nil
        controller?.dispose()
    }

    // MARK: - Component initialization

    private func createComponentView(_ controller: ComponentProxy, generation: Int) {
        Task { @MainActor [weak self, weak controller] in
            guard let self, let controller else { return }
            do {
                guard let viewController = try controller.makeViewController(),
                      self.controller === controller,
                      self.creationGeneration == generation else {
                    controller.dispose()
                    return
                }
                self.componentViewController = viewController
                self.embedComponentView(viewController)
            } catch {
                guard self.controller === controller,
                      self.creationGeneration == generation else {
                    return
                }
                self.controller = nil
                controller.dispose()
            }
        }
    }

    private func makeTarget(kind: String, value: String) -> TurboCheckoutTarget? {
        switch kind {
        case "paymentMethod":
            guard let type = PaymentMethodType(rawValue: value) else { return nil }
            return .paymentMethod(type)
        case "storedPaymentMethod":
            return .storedPaymentMethod(value)
        default:
            return nil
        }
    }

    // MARK: - View embedding

    @MainActor
    private func embedComponentView(_ childVC: UIViewController) {
        _ = childVC.view // force load view

        if let parentVC = parentViewController {
            parentVC.addChild(childVC)
            childVC.didMove(toParent: parentVC)
        }

        componentView = childVC.view
        addArrangedSubview(childVC.view)
        disableNativeScrollingAndBouncing(in: childVC.view)
        layoutIfNeeded()
    }

    private func disableNativeScrollingAndBouncing(in componentView: UIView) {
        guard let formView: UIScrollView = componentView.findSubview() else { return }
        formView.bounces = false
        formView.isScrollEnabled = false
        formView.alwaysBounceVertical = false
        formView.contentInsetAdjustmentBehavior = .never
    }

    // MARK: - Layout reporting

    private var preferredContentSize: CGSize {
        componentViewController?.preferredContentSize ?? .zero
    }

    private func reportContentHeight() {
        let size = preferredContentSize
        guard abs(size.height - lastReportedHeight) > 1 else { return }
        lastReportedHeight = size.height
        delegate?.onLayoutChange(width: size.width, height: size.height)
    }
}
