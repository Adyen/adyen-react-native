import UIKit
import Adyen

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }

        guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }

        let sceneWindow = UIWindow(windowScene: windowScene)
        window = sceneWindow

        appDelegate.startReactNative(in: sceneWindow)
    }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
      guard let url = URLContexts.first?.url else { return }
      RedirectComponent.applicationDidOpen(from: url)
  }
}
