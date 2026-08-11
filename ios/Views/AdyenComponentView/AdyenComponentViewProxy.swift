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

/// Backing UIKit view for the generic Fabric `<AdyenComponent>` component. Registers a per-view
/// controller with ``ComponentModule`` and embeds the payment component built for the `type` prop.
@objc(AdyenComponentViewProxy)
public final class AdyenComponentViewProxy: UIStackView {

    private var controller: EmbeddedComponentDelegateProxy?
    private var componentViewController: UIViewController?
    private var type: String?
    private var configurationJSON: NSDictionary?
    private var hasComponent: Bool = false
    private var componentView: UIView?
    private var lastReportedHeight: CGFloat = 0
    @objc public var viewId: String?

    @objc public weak var delegate: AdyenComponentViewProxyDelegate?

    @objc override public init(frame: CGRect) {
        super.init(frame: frame)
        clipsToBounds = false
    }

    @available(*, unavailable)
    required init(coder _: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    @objc public func setType(_ type: String?) {
        guard let type, !type.isEmpty else { return }
        self.type = type
        initializeComponentIfNeeded()
    }

    @objc public func setConfiguration(_ configurationJSON: String?) {
        guard let jsonString = configurationJSON,
              let data = jsonString.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? NSDictionary else {
            return
        }
        self.configurationJSON = json
        initializeComponentIfNeeded()
    }

    override public func layoutSubviews() {
        super.layoutSubviews()
        reportContentHeight()
    }

    @objc public func dispose() {
        if let childVC = componentViewController {
            childVC.willMove(toParent: nil)
            childVC.view.removeFromSuperview()
            childVC.removeFromParent()
        }
        componentView = nil
        componentViewController = nil
        hasComponent = false
        type = nil
        configurationJSON = nil
        lastReportedHeight = 0
        if let viewId {
            ComponentModule.shared?.unregister(viewId: viewId)
        }
        controller = nil
        viewId = nil
    }

    // MARK: - Component initialization

    private func initializeComponentIfNeeded() {
        guard !hasComponent,
              let type,
              let viewId else {
            return
        }
        let configuration = configurationJSON ?? [:]
        self.hasComponent = true
        guard let componentBus = ComponentModule.shared else {
            assertionFailure("ComponentModule not initialized")
            self.hasComponent = false
            return
        }

        let controller = componentBus.register(viewId: viewId)
        self.controller = controller

        Task { @MainActor [weak self] in
            guard let self else { return }
            do {
                guard let viewController = try await controller.makeViewController(
                    type: type,
                    configuration: configuration
                ) else {
                    self.hasComponent = false
                    return
                }
                self.componentViewController = viewController
                self.embedComponentView(viewController)
            } catch {
                self.hasComponent = false
                controller.sendError(error: error)
            }
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
