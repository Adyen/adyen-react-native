require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "adyen-react-native"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platform     = :ios, "12.0"
  s.source       = { :git => "https://github.com/Adyen/adyen-react-native.git", :tag => "#{s.version}" }
  s.source_files = "ios/**/*.{h,m,mm,cpp,swift}"
  s.exclude_files = ["ios/Package.swift", "ios/.build/**/*"]
  s.public_header_files = "ios/include/ADYRedirectComponent.h"

  s.resource_bundles = { 'adyen-react-native' => [ 'ios/PrivacyInfo.xcprivacy' ] }

  s.pod_target_xcconfig = {
    # Swift `package` access needs a package name; SwiftPM passes it for ios/Package.swift.
    "OTHER_SWIFT_FLAGS" => "$(inherited) -package-name AdyenReactNative"
  }

  # Adyen iOS is distributed as a Swift package; React Native's spm_dependency helper adds it to the
  # Pods project. Keep the version in sync with ios/Package.swift.
  spm_dependency(s,
    url: "https://github.com/Adyen/adyen-ios",
    requirement: { kind: "exactVersion", version: "5.27.0" },
    products: ["Adyen", "AdyenActions", "AdyenCard", "AdyenComponents", "AdyenDropIn", "AdyenEncryption", "AdyenSession"]
  )
  require_relative "ios/adyen_spm_embed"
  AdyenSPMEmbed.prepare_framework(s)

  install_modules_dependencies(s)
end
