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

@objc(CardComponentViewProxy)
public final class CardComponentViewProxy: UIStackView {

    private var cardComponent: CardComponent?
    private var paymentMethodJSON: NSDictionary?
    private var configurationJSON: NSDictionary?
    private var hasComponent: Bool = false
    private var componentView: UIView?
    private var lastReportedHeight: CGFloat = 0
    private var componentType: String?
    private var delegateProxy: EmbeddedComponentDelegateProxy?

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
        self.componentType = json["type"] as? String
        tryInitializeComponent()
    }

    @objc public func setConfiguration(_ configurationJSON: String?) {
        guard let jsonString = configurationJSON,
              let data = jsonString.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? NSDictionary else {
            return
        }
        self.configurationJSON = json
        tryInitializeComponent()
    }

    override public func layoutSubviews() {
        super.layoutSubviews()
        reportContentHeight()
    }

    @objc public func dispose() {
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
        if let componentType {
            EmbeddedComponentBusModule.shared?.unregister(componentType: componentType)
        }
        delegateProxy = nil
        componentType = nil
    }

    private func tryInitializeComponent() {
        guard !hasComponent,
              let paymentMethodJSON,
              let configurationJSON,
              let componentType else {
            return
        }
        self.hasComponent = true
        guard let adyenComponentBus = EmbeddedComponentBusModule.shared else {
            assertionFailure("EmbeddedComponentBusModule not initialized")
            return
        }

        do {
            let parser = RootConfigurationParser(configuration: configurationJSON)
            let context = try parser.fetchContext(session: BaseModule.session)
            let paymentMethod = try parseCardPaymentMethod(from: paymentMethodJSON)

            let proxy = adyenComponentBus.register(componentType: componentType)
            self.delegateProxy = proxy

            let cardConfig = CardConfigurationParser(configuration: configurationJSON,
                                                     delegate: proxy).configuration

            let component = CardComponent(paymentMethod: paymentMethod, context: context, configuration: cardConfig)
            component.cardComponentDelegate = proxy
            component.delegate = BaseModule.session ?? proxy

            self.cardComponent = component
            adyenComponentBus.createActionHandlerIfNeeded(context: context, locale: parser.shopperLocale)

            embedComponentView(component)
        } catch {
            self.hasComponent = false
            adyenComponentBus.sendError(error: error)
        }
    }

    private func embedComponentView(_ component: CardComponent) {
        componentView = component.viewController.view
        let childVC = component.viewController
        DispatchQueue.main.async { [weak self] in
            guard let self, let view = childVC.viewIfLoaded else { return }

            if let parentVC = self.parentViewController {
                parentVC.addChild(childVC)
                childVC.didMove(toParent: parentVC)
            }

            self.addArrangedSubview(view)
            disableNativeScrollingAndBouncing(cardView: view)
            self.layoutIfNeeded()
        }
    }

    private func disableNativeScrollingAndBouncing(cardView: UIView) {
        let formView: UIScrollView? = cardView.findSubview()
        formView?.bounces = false
        formView?.isScrollEnabled = false
        formView?.alwaysBounceVertical = false
        formView?.contentInsetAdjustmentBehavior = .never
    }

    private var parentViewController: UIViewController? {
        var responder: UIResponder? = self
        while let nextResponder = responder?.next {
            if let viewController = nextResponder as? UIViewController {
                return viewController
            }
            responder = nextResponder
        }
        return nil
    }

    private var actualSize: CGSize {
        guard let vc = cardComponent?.viewController else { return .zero }
        return vc.preferredContentSize
    }

    private func reportContentHeight() {
        let size = actualSize
        guard abs(size.height - lastReportedHeight) > 1 else { return }
        lastReportedHeight = size.height
        delegate?.onLayoutChange(width: size.width, height: size.height)
    }

    private func parseCardPaymentMethod(from dictionary: NSDictionary) throws -> CardPaymentMethod {
        guard let data = try? JSONSerialization.data(withJSONObject: dictionary, options: []),
              let paymentMethod = try? JSONDecoder().decode(CardPaymentMethod.self, from: data) else {
            throw ModuleException.paymentMethodNotFound(CardPaymentMethod.self)
        }
        return paymentMethod
    }
}

extension CardComponentViewProxy: PresentationDelegate {
    public func present(component: PresentableComponent) {
        guard let presenter = BaseModule.currentPresenter ?? UIViewController.topPresenter else {
            EmbeddedComponentBusModule.shared?.sendError(error: ModuleException.notKeyWindow)
            return
        }

        DispatchQueue.main.async {
            BaseModule.currentPresenter = presenter
            presenter.present(component.viewController, animated: true)
        }
    }
}
