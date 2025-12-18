//
// Copyright (c) 2022 Adyen N.V.
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
    private var actionHandler: AdyenActionComponent?
    private var paymentMethodJSON: NSDictionary?
    private var configurationJSON: NSDictionary?
    private var hasComponent: Bool = false
    private var componentView: UIView?
    private var lastReportedHeight: CGFloat = 0

    @objc public weak var delegate: CardComponentViewProxyDelegate?

    @objc override public init(frame: CGRect) {
        super.init(frame: frame)
        clipsToBounds = false
        isUserInteractionEnabled = true
    }

    @available(*, unavailable)
    required init(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    @objc public func setPaymentMethod(_ paymentMethodJSON: String?) {
        guard let jsonString = paymentMethodJSON,
              let data = jsonString.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? NSDictionary else {
            return
        }
        self.paymentMethodJSON = json
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

    var actualSize: CGSize {
        guard let vc = cardComponent?.viewController else { return .zero }
        return vc.preferredContentSize
    }

    private func tryInitializeComponent() {
        guard !hasComponent,
              let paymentMethodJSON,
              let configurationJSON else {
            return
        }

        do {
            let parser = RootConfigurationParser(configuration: configurationJSON)
            let context = try parser.fetchContext(session: BaseModule.session)
            let paymentMethod = try parseCardPaymentMethod(from: paymentMethodJSON)

            let cardConfig = CardConfigurationParser(configuration: configurationJSON, delegate: self).configuration
            let component = CardComponent(paymentMethod: paymentMethod, context: context, configuration: cardConfig)
            component.delegate = self
            component.cardComponentDelegate = self

            self.cardComponent = component
            self.hasComponent = true

            setupActionHandler(context: context, parser: parser)
            embedComponentView(component)
        } catch {
            AdyenEventEmitter.shared.sendErrorEvent(error: error)
        }
    }

    private func setupActionHandler(context: AdyenContext, parser: RootConfigurationParser) {
        let style = AdyenAppearanceLoader.findStyle()?.actionComponent ?? .init()
        var config = AdyenActionComponent.Configuration(style: style)
        if let locale = BaseModule.session?.sessionContext.shopperLocale ?? parser.shopperLocale {
            config.localizationParameters = LocalizationParameters(enforcedLocale: locale)
        }
        actionHandler = AdyenActionComponent(context: context, configuration: config)
        actionHandler?.delegate = self
        actionHandler?.presentationDelegate = self
    }

    private func embedComponentView(_ component: CardComponent) {
        componentView = component.viewController.view
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }

            let childVC = component.viewController
            let view = childVC.view!

            // Add as child view controller for proper UIKit containment
            if let parentVC = self.parentViewController {
                parentVC.addChild(childVC)
                childVC.didMove(toParent: parentVC)
            }

            self.addArrangedSubview(view)
            disableNativeScrollingAndBouncing(cardView: view)

            // Report actual content size to React Native
            self.layoutIfNeeded()
        }
    }

    private func disableNativeScrollingAndBouncing(cardView: UIView) {
        let formView = cardView.subviews[0].subviews[0] as? UIScrollView
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

    override public func layoutSubviews() {
        super.layoutSubviews()
        reportContentHeight()
    }

    private func reportContentHeight() {
        let size = actualSize
        // Only report if height changed significantly
        guard abs(size.height - lastReportedHeight) > 1 else { return }
        lastReportedHeight = size.height

        // Report to React Native
        delegate?.onLayoutChange(width: size.width, height: size.height)
    }

    private func parseCardPaymentMethod(from dictionary: NSDictionary) throws -> CardPaymentMethod {
        guard let data = try? JSONSerialization.data(withJSONObject: dictionary, options: []),
              let paymentMethod = try? JSONDecoder().decode(CardPaymentMethod.self, from: data) else {
            throw BaseModule.NativeModuleError.paymentMethodNotFound(CardPaymentMethod.self)
        }
        return paymentMethod
    }

    @objc public func handleAction(_ actionJSON: NSDictionary) {
        guard let data = try? JSONSerialization.data(withJSONObject: actionJSON, options: []),
              let action = try? JSONDecoder().decode(Action.self, from: data) else {
            AdyenEventEmitter.shared.sendErrorEvent(error: BaseModule.NativeModuleError.invalidAction as NSError)
            return
        }

        DispatchQueue.main.async { [weak self] in
            self?.actionHandler?.handle(action)
        }
    }

    @objc public func dispose() {
        // Remove child view controller properly
        if let childVC = cardComponent?.viewController {
            childVC.willMove(toParent: nil)
            childVC.view.removeFromSuperview()
            childVC.removeFromParent()
        }
        componentView = nil
        cardComponent?.cancelIfNeeded()
        actionHandler?.cancelIfNeeded()
        cardComponent = nil
        actionHandler = nil
        hasComponent = false
        paymentMethodJSON = nil
        configurationJSON = nil
        lastReportedHeight = 0
    }
}

extension CardComponentViewProxy: PaymentComponentDelegate {
    public func didSubmit(_ data: PaymentComponentData, from component: PaymentComponent) {
        AdyenEventEmitter.shared.sendSubmitEvent(paymentData: data.jsonObject, extra: nil)
    }

    public func didFail(with error: Error, from component: PaymentComponent) {
        AdyenEventEmitter.shared.sendErrorEvent(error: error)
    }
}

extension CardComponentViewProxy: ActionComponentDelegate {
    public func didProvide(_ data: ActionComponentData, from component: ActionComponent) {
        AdyenEventEmitter.shared.sendProvideEvent(actionData: data.jsonObject)
    }

    public func didComplete(from component: ActionComponent) {
        AdyenEventEmitter.shared.sendCompleteEvent()
    }

    public func didFail(with error: Error, from component: ActionComponent) {
        AdyenEventEmitter.shared.sendErrorEvent(error: error)
    }
}

extension CardComponentViewProxy: PresentationDelegate {
    public func present(component: PresentableComponent) {
        guard let presenter = BaseModule.currentPresenter ?? UIViewController.topPresenter else {
            AdyenEventEmitter.shared.sendErrorEvent(error: BaseModule.NativeModuleError.notKeyWindow)
            return
        }

        DispatchQueue.main.async {
            presenter.present(component.viewController, animated: true)
        }
    }
}

extension CardComponentViewProxy: CardComponentDelegate {
    public func didSubmit(lastFour: String, finalBIN: String, component: CardComponent) {
        /* No callback implemented */
    }

    public func didChangeBIN(_ value: String, component: CardComponent) {
        AdyenEventEmitter.shared.sendBinValueEvent(binValue: value)
    }

    public func didChangeCardBrand(_ value: [CardBrand]?, component: CardComponent) {
        guard let value, !value.isEmpty else { return }
        let brands = value.map(\.type.rawValue)
        AdyenEventEmitter.shared.sendBinLookupEvent(brands: brands)
    }
}

extension CardComponentViewProxy: AddressLookupProvider {
    public func lookUp(searchTerm: String, resultHandler: @escaping ([LookupAddressModel]) -> Void) {
        resultHandler([])
    }

    public func complete(
        incompleteAddress: LookupAddressModel,
        resultHandler: @escaping (Result<PostalAddress, any Error>) -> Void
    ) {
        resultHandler(.success(incompleteAddress.postalAddress))
    }
}
