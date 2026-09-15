require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "adyen-react-native"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platform     = :ios, "16.0"
  s.source       = { :git => "https://github.com/Adyen/adyen-react-native.git", :tag => "#{s.version}" }
  s.source_files = "ios/**/*.{h,m,mm,cpp,swift}"
  s.public_header_files = "ios/ADYRedirectComponent.h"

  # Vendored as separate per-module xcframeworks, built from a local checkout of
  # https://github.com/Adyen/adyen-ios at tag 6.0.0-alpha.1 via `scripts/build-xcframeworks.sh`
  # (see `scripts/ensure-xcframeworks.sh`, which `yarn app pod` runs automatically) - rather than
  # depending on the umbrella "Adyen" CocoaPods pod. The umbrella pod merges every Adyen module
  # into a single "Adyen" module, so canImport(AdyenCard)/canImport(AdyenComponents) are false
  # and the factories needed to build Card/Components payment methods get compiled out.
  # Vendoring the real, separate modules makes canImport correct. Not committed to git (see
  # .gitignore) - bump the tag above and rebuild when upgrading the pinned adyen-ios version.
  s.vendored_frameworks = [
    'ios/frameworks/Adyen.xcframework',
    'ios/frameworks/AdyenEncryption.xcframework',
    'ios/frameworks/AdyenUI.xcframework',
    'ios/frameworks/AdyenCard.xcframework',
    'ios/frameworks/AdyenComponents.xcframework',
    'ios/frameworks/AdyenActions.xcframework',
    'ios/frameworks/AdyenSession.xcframework',
    'ios/frameworks/AdyenDropIn.xcframework',
    'ios/frameworks/AdyenCheckout.xcframework',
  ]
  s.resource_bundles = { 'adyen-react-native' => [ 'ios/PrivacyInfo.xcprivacy' ] }

  # Transitive dependencies the umbrella "Adyen" pod used to pull in automatically via its own
  # podspec (Adyen/Core depends on AdyenNetworking, Adyen/Actions depends on Adyen3DS2). Vendoring
  # the xcframeworks directly bypasses CocoaPods' own dependency resolution for them, so they need
  # to be declared here too, pinned to the same versions Adyen 6.0.0-alpha.1 itself used.
  s.dependency "AdyenNetworking", "3.0.1"
  s.dependency "Adyen3DS2", "2.4.4"

  # Not compiled with `-package-name com.adyen.checkout` (matching the vendored xcframeworks'
  # own package): Swift refuses to import a same-package module unless it's loaded from source
  # or from its .package.swiftinterface, and its loader for vendored xcframeworks never tries
  # the package interface (only .private/.public) - declaring a matching package name blocks
  # importing the frameworks at all, regardless of whether package-level symbols are even used.
  # DropIn's use of package-scoped types (PaymentComponent, AnyDropInComponent, Balance, etc.)
  # is disabled in DropInModule+Delegates.swift for this reason; see the TODOs there.
  s.pod_target_xcconfig = {
    # Adyen.xcframework's own textual swiftinterface does `import AdyenNetworking`. Since
    # AdyenNetworking is a source pod compiled fresh into this build (not vendored), its build
    # product needs to be explicitly searchable when that interface gets reconstructed here.
    'FRAMEWORK_SEARCH_PATHS' => '$(inherited) "$(PODS_CONFIGURATION_BUILD_DIR)/AdyenNetworking"'
  }

  install_modules_dependencies(s)
end
