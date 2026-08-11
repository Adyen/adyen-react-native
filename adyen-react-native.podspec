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

  s.dependency "Adyen", '6.0.0-alpha.1'
  s.resource_bundles = { 'adyen-react-native' => [ 'ios/PrivacyInfo.xcprivacy' ] }

  # Compile into Adyen's Swift package so the bridge can reach the SDK's `package`-level
  # redirect-return API. In the umbrella CocoaPods build every Adyen module merges into a single
  # `Adyen` module, so `canImport(AdyenActions)` is false and the public `Checkout.handleReturn`
  # is compiled out; `RedirectComponent.applicationDidOpen(from:)` (which it wraps) is only
  # reachable from the same package.
  s.pod_target_xcconfig = {
    'OTHER_SWIFT_FLAGS' => '$(inherited) -package-name com.adyen.checkout'
  }

  install_modules_dependencies(s)
end
