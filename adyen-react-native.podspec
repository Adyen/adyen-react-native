require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "adyen-react-native"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  # CocoaPods integration is deprecated in favor of Swift Package Manager (ios/Package.swift,
  # React Native >= 0.87). The podspec stays functional for Expo and other CocoaPods-based apps;
  # `deprecated` only makes `pod install` print a warning.
  s.deprecated   = true

  s.platform     = :ios, "12.0"
  s.source       = { :git => "https://github.com/Adyen/adyen-react-native.git", :tag => "#{s.version}" }
  s.source_files = "ios/**/*.{h,m,mm,cpp,swift}"
  s.exclude_files = ["ios/Package.swift", "ios/.build/**/*"]
  s.public_header_files = "ios/include/ADYRedirectComponent.h"

  s.dependency "Adyen", '5.26.0'
  s.resource_bundles = { 'adyen-react-native' => [ 'ios/PrivacyInfo.xcprivacy' ] }

  install_modules_dependencies(s)
end
