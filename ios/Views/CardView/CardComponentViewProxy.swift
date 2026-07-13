//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import UIKit

@objc public protocol CardComponentViewProxyDelegate: AnyObject {
    func onLayoutChange(width: CGFloat, height: CGFloat)
}

/// Hosts a native `CardComponent` inside a React Native Fabric view.
///
/// Component creation and view-hierarchy attachment are decoupled because Fabric's mount lifecycle
/// delivers them in either order: props (triggering `performInitialization`) may arrive before or after
/// the proxy is added to a window. `attachChildViewControllerIfNeeded()` is called from both
/// `performInitialization` and `didMoveToWindow` to cover both cases; it is idempotent (`childVC.parent == nil` guard).
@objc(CardComponentViewProxy)
public final class CardComponentViewProxy: UIStackView {

    private var cardComponent: CardComponent?
    private var paymentMethodJSON: NSDictionary?
    private var configurationJSON: NSDictionary?
    private var hasComponent: Bool = false
    private var componentView: UIView?
    private var lastReportedHeight: CGFloat = 0
    @objc public var viewId: String?

    @objc public weak var delegate: CardComponentViewProxyDelegate?

    @objc override public init(frame: CGRect) {
        super.init(frame: frame)
        clipsToBounds = false
    }

    @available(*, unavailable)
    required init(coder _: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    @objc public func setPaymentMethod(_ paymentMethodJSON: String?) {
        guard let jsonString = paymentMethodJSON,
              let data = jsonString.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? NSDictionary else {
            return
        }
        self.paymentMethodJSON = json
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
        ensureMainThread {
            self.performDispose()
        }
    }

    private func performDispose() {
        if let childVC = cardComponent?.viewController {
            childVC.willMove(toParent: nil)
            childVC.view.removeFromSuperview()
            childVC.removeFromParent()
        }
        componentView = nil
        cardComponent?.cancelIfNeeded()
        cardComponent = nil
        hasComponent = false
        paymentMethodJSON = nil
        configurationJSON = nil
        lastReportedHeight = 0
        if let viewId {
            EmbeddedComponentBusModule.shared?.unregister(viewId: viewId)
        }
        viewId = nil
    }

    // MARK: - Component initialization

    private func initializeComponentIfNeeded() {
        ensureMainThread { [weak self] in
            guard let self,
                  !self.hasComponent,
                  let paymentMethodJSON = self.paymentMethodJSON,
                  let configurationJSON = self.configurationJSON,
                  let viewId = self.viewId else {
                return
            }
            self.performInitialization(paymentMethodJSON, configurationJSON, viewId)
        }
    }

    private func performInitialization(_ paymentMethodJSON: NSDictionary, _ configurationJSON: NSDictionary, _ viewId: String) {
        self.hasComponent = true
        guard let componentBus = EmbeddedComponentBusModule.shared else {
            assertionFailure("EmbeddedComponentBusModule not initialized")
            return
        }

        let proxy = componentBus.register(viewId: viewId)
        do {
            let component = try createCardComponent(
                paymentMethodJSON: paymentMethodJSON,
                configurationJSON: configurationJSON,
                proxy: proxy
            )
            self.cardComponent = component
            loadComponentView(component)
            attachChildViewControllerIfNeeded()
        } catch {
            self.hasComponent = false
            componentBus.sendError(error: error)
            return
        }
    }

    private func createCardComponent(
        paymentMethodJSON: NSDictionary,
        configurationJSON: NSDictionary,
        proxy: EmbeddedComponentDelegateProxy
    ) throws -> CardComponent {
        let parser = RootConfigurationParser(configuration: configurationJSON)
        let context = try parser.fetchContext(session: BaseModule.session)
        let paymentMethod = try parseCardPaymentMethod(from: paymentMethodJSON)

        let cardConfig = CardConfigurationParser(
            configuration: configurationJSON,
            delegate: proxy
        ).configuration

        let component = CardComponent(
            paymentMethod: paymentMethod,
            context: context,
            configuration: cardConfig
        )
        component.cardComponentDelegate = proxy
        component.delegate = BaseModule.session ?? proxy
        EmbeddedComponentBusModule.shared?.createActionHandlerIfNeeded(context: context, locale: parser.shopperLocale)
        return component
    }

    // MARK: - View embedding

    private func loadComponentView(_ component: CardComponent) {
        let childVC = component.viewController
        _ = childVC.view // force load view
        componentView = childVC.view
        addArrangedSubview(childVC.view)
        disableNativeScrollingAndBouncing(in: childVC.view)
    }

    /// Attaches the child view controller to its parent if the proxy is already in the view hierarchy.
    /// Called both from `performInitialization` and `didMoveToWindow` to handle either ordering:
    /// component created before or after the proxy is added to the window.
    private func attachChildViewControllerIfNeeded() {
        guard let childVC = cardComponent?.viewController, childVC.parent == nil else { return }
        guard let parentVC = parentViewController else { return }
        parentVC.addChild(childVC)
        childVC.didMove(toParent: parentVC)
        layoutIfNeeded()
    }

    override public func didMoveToWindow() {
        super.didMoveToWindow()
        if window != nil {
            attachChildViewControllerIfNeeded()
        }
    }

    private func disableNativeScrollingAndBouncing(in cardView: UIView) {
        guard let formView: UIScrollView = cardView.findSubview() else { return }
        formView.bounces = false
        formView.isScrollEnabled = false
        formView.alwaysBounceVertical = false
        formView.contentInsetAdjustmentBehavior = .never
    }

    // MARK: - Layout reporting

    private var preferredContentSize: CGSize {
        guard let vc = cardComponent?.viewController else { return .zero }
        return vc.preferredContentSize
    }

    private func reportContentHeight() {
        let size = preferredContentSize
        guard abs(size.height - lastReportedHeight) > 1 else { return }
        lastReportedHeight = size.height
        delegate?.onLayoutChange(width: size.width, height: size.height)
    }

    // MARK: - Helpers

    private func parseCardPaymentMethod(from dictionary: NSDictionary) throws -> CardPaymentMethod {
        guard let data = try? JSONSerialization.data(withJSONObject: dictionary, options: []),
              let paymentMethod = try? JSONDecoder().decode(CardPaymentMethod.self, from: data) else {
            throw ModuleException.paymentMethodNotFound(CardPaymentMethod.self)
        }
        return paymentMethod
    }
}
