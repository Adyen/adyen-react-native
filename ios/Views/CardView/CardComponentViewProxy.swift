import Adyen
import UIKit

@objc(CardComponentViewProxy)
final class CardComponentViewProxy: UIView {

  private let component: CardComponent

  @objc
  init(
    paymentMethod: CardPaymentMethod,
    dictiomnary
  ) {
    component = CardComponent(paymentMethod: paymentMethod, context: BaseModule.)
    super.init()

    self.addSubview(component.viewController.view)
    self.
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
