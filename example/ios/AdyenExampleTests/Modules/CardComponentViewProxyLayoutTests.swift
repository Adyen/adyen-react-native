//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

@_spi(AdyenInternal) import Adyen
@testable import adyen_react_native
import UIKit
import XCTest

/// The embedded card form where a scrolling page can put it: at the bottom of the screen, in the bottom safe area.
final class CardComponentViewProxyLayoutTests: XCTestCase {

    private var window: UIWindow?

    override func tearDown() {
        window?.isHidden = true
        window = nil
        EmbeddedComponentBusModule.shared = nil
        super.tearDown()
    }

    func test_mountedAtTheBottomEdge_layoutSettles() {
        // Before the fix, the layout of a card view mounted here never finished, so this test hung.
        executionTimeAllowance = 60

        // GIVEN a page with a bottom safe area
        let page = makePage()

        // WHEN a card view mounts 0 pt tall at the bottom edge, as React Native mounts it before its height arrives
        let cardView = mountCardView(in: page, atY: page.view.bounds.height)

        // THEN its layout settles, and it reports the form's height
        XCTAssertGreaterThan(cardView.reportedHeight, 0)
    }

    func test_sizedInTheBottomSafeArea_showsTheWholeForm() throws {
        // GIVEN a card view mounted on screen, 300 pt above the bottom edge of a page with a bottom safe area
        let page = makePage()
        let cardView = mountCardView(in: page, atY: page.view.bounds.height - 300)

        // WHEN it gets its height, which takes its bottom past the bottom edge
        cardView.frame.size.height = cardView.reportedHeight
        page.view.layoutIfNeeded()

        // THEN Adyen's scroll view is as tall as the form, so no part of the form is cut off
        let scrollView = try XCTUnwrap(cardView.formScrollView)
        XCTAssertEqual(scrollView.frame.height, cardView.reportedHeight, accuracy: 0.5)
    }

    // MARK: - Helpers

    private func makePage() -> UIViewController {
        let page = UIViewController()
        // A bottom safe area on any device, like the 34 pt home indicator area of an iPhone 17 Pro.
        page.additionalSafeAreaInsets.bottom = 34
        let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene
        let window = scene.map(UIWindow.init(windowScene:)) ?? UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = page
        window.makeKeyAndVisible()
        page.view.layoutIfNeeded()
        self.window = window
        return page
    }

    /// Mounts a card view the way React Native does: its props arrive first, then it is added to the page 0 pt tall.
    private func mountCardView(in page: UIViewController, atY y: CGFloat) -> CardViewHost {
        EmbeddedComponentBusModule.shared = EmbeddedComponentBusModule()
        let host = CardViewHost(frame: CGRect(x: 16, y: y, width: page.view.bounds.width - 32, height: 0))
        host.proxy.viewId = "card-view"
        host.proxy.setPaymentMethod(#"{"type": "scheme", "name": "Cards", "brands": ["mc", "visa"]}"#)
        host.proxy.setConfiguration(
            #"{"clientKey": "test_clientkey", "card": {"holderNameRequired": true, "showStorePaymentField": true}}"#
        )
        page.view.addSubview(host)
        page.view.layoutIfNeeded()
        return host
    }
}

/// Stands in for `ADYCardView`, the Fabric view that holds the proxy and passes its height to React Native.
private final class CardViewHost: UIView, CardComponentViewProxyDelegate {
    let proxy: CardComponentViewProxy
    private(set) var reportedHeight: CGFloat = 0

    override init(frame: CGRect) {
        proxy = CardComponentViewProxy(frame: CGRect(origin: .zero, size: frame.size))
        super.init(frame: frame)
        proxy.delegate = self
        proxy.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        addSubview(proxy)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func onLayoutChange(width: CGFloat, height: CGFloat) {
        reportedHeight = height
    }

    /// The scroll view that Adyen's form is laid out in.
    var formScrollView: UIScrollView? {
        Self.firstScrollView(in: self)
    }

    private static func firstScrollView(in view: UIView) -> UIScrollView? {
        for subview in view.subviews {
            if let scrollView = subview as? UIScrollView ?? firstScrollView(in: subview) {
                return scrollView
            }
        }
        return nil
    }
}
