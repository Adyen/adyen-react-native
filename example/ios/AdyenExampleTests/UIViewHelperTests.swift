//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

@testable import adyen_react_native
import UIKit
import XCTest

final class UIViewHelperTests: XCTestCase {

    func test_findSubview_searchesTheWholeViewTree() {
        // GIVEN a tree where every level starts with a plain decoy view, and a scroll view sits four levels deep
        let (root, scrollView) = makeDecoyTree()

        // WHEN the tree is searched for a scroll view
        let found: UIScrollView? = root.findSubview()

        // THEN the deeply nested scroll view is found
        XCTAssertIdentical(found, scrollView)
    }

    func test_findSubview_returnsNilWhenTypeAbsent() {
        // GIVEN a tree without any labels
        let (root, _) = makeDecoyTree()

        // WHEN the tree is searched for a label
        let found: UILabel? = root.findSubview()

        // THEN nothing is found
        XCTAssertNil(found)
    }

    func test_findSubview_findsDirectSubview() {
        // GIVEN a scroll view directly inside a view
        let root = UIView()
        let scrollView = UIScrollView()
        root.addSubview(scrollView)

        // WHEN the view is searched for a scroll view
        let found: UIScrollView? = root.findSubview()

        // THEN the direct subview is found
        XCTAssertIdentical(found, scrollView)
    }

    // MARK: - Helpers

    /// A tree of container views, each hiding a plain decoy view in front of the next level, with a scroll view four levels deep.
    private func makeDecoyTree() -> (root: UIView, scrollView: UIScrollView) {
        let root = UIView()
        var container = root
        for _ in 0..<3 {
            // A decoy: the search must look past the first subview of every level.
            container.addSubview(UIView())
            let next = UIView()
            container.addSubview(next)
            container = next
        }
        let scrollView = UIScrollView()
        container.addSubview(scrollView)
        return (root, scrollView)
    }
}
