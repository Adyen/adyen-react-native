import Adyen
import AdyenCard
import UIKit

@objc(CardComponentViewProxy)
final class CardComponentViewProxy: NSObject {

    @objc
    let viewController: UIViewController

    private let component: CardComponent

    @objc
    init(
        paymentMethod: PaymentMethod, context: AdyenContext,
        configuration: CardComponent.Configuration
    ) {
        component = CardComponent(
            paymentMethod: paymentMethod,
            context: context,
            configuration: configuration
        )
        viewController = component.viewController
        super.init()
    }

    @objc
    func setDelegate(delegate: PaymentComponentDelegate) {
        component.delegate = delegate
    }

    @objc
    func getPaymentComponentData(from data: PaymentComponentData) -> NSDictionary? {
        let encodableData = EncodablePaymentComponentData(data: data)
        return try? encodableData.jsonDictionary()
    }
}
