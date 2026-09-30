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

# Use separate Adyen xcframeworks so payment-method modules remain available.
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

  # Declare dependencies normally provided by the umbrella Adyen pod.
  s.dependency "AdyenNetworking", "3.0.1"
  s.dependency "Adyen3DS2", "2.4.4"

  s.pod_target_xcconfig = {
    # Make AdyenNetworking available when loading Adyen's Swift interface.
    'FRAMEWORK_SEARCH_PATHS' => '$(inherited) "$(PODS_CONFIGURATION_BUILD_DIR)/AdyenNetworking"'
  }

  install_modules_dependencies(s)
end
