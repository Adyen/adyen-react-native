import Adyen
import UIKit

class ComponentWrapperView: UIStackView {
    var resizeViewportCallback: () -> Void = {}

    init() {
        super.init(frame: .zero)
        axis = .vertical
    }

    @available(*, unavailable)
    required init(coder _: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override var safeAreaInsets: UIEdgeInsets { .zero }

    override func layoutSubviews() {
        super.layoutSubviews()

        resizeViewportCallback()
    }
}