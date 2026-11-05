#
# Copyright (c) 2026 Adyen N.V.
#
# This file is open source and available under the MIT license. See the LICENSE file for more info.
#

# React Native's `spm_dependency` links the Swift package products into the pod, but CocoaPods only
# embeds the frameworks of pods. Adyen iOS depends on the dynamic Adyen3DS2.framework (a binary
# target of adyen-3ds2-ios), so without this the app crashes at launch with dyld
# "Library not loaded: @rpath/Adyen3DS2.framework". Adding the framework to the frameworks CocoaPods
# embeds also makes CocoaPods create the "[CP] Embed Pods Frameworks" phase and its file lists.
module AdyenSPMEmbed
  POD_NAME = "adyen-react-native"
  MODULE_NAME = "adyen_react_native"
  FRAMEWORK_NAME = "Adyen3DS2.framework"
  # Xcode copies a binary target's framework into the shared products directory.
  FRAMEWORK_PATH = "${PODS_CONFIGURATION_BUILD_DIR}/#{FRAMEWORK_NAME}"

  # Xcode copies Adyen3DS2.framework out of the package checkout with read-only files, so the app's
  # embed phase cannot re-sign its copy ("Permission denied"). Xcode also writes the xcframework
  # signature both to the shared products directory and to the pod's build directory, and archiving
  # fails because both copies land in the archive's Signatures folder; the pod's copy is removed.
  def self.prepare_framework(spec)
    spec.script_phase = {
      :name => "[#{POD_NAME}] Prepare #{FRAMEWORK_NAME} for embedding",
      :script => <<~'SH',
        chmod -R u+w "${PODS_CONFIGURATION_BUILD_DIR}/Adyen3DS2.framework" 2>/dev/null || true
        if [ "${CONFIGURATION_BUILD_DIR}" != "${PODS_CONFIGURATION_BUILD_DIR}" ]; then
          rm -f "${CONFIGURATION_BUILD_DIR}/Adyen3DS2.xcframework-ios.signature"
        fi
      SH
      :execution_position => :after_compile,
      :always_out_of_date => "1"
    }
  end

  module AggregateTarget
    def framework_paths_by_config
      @adyen_framework_paths_by_config ||= super.to_h do |config, list|
        uses_adyen = pod_targets_for_build_configuration(config).any? { |pod| pod.pod_name == POD_NAME }
        embedded = list.any? { |path| path.source_path.end_with?("/#{FRAMEWORK_NAME}") }
        [config, uses_adyen && !embedded ? list + [Pod::Xcode::FrameworkPaths.new(FRAMEWORK_PATH)] : list]
      end
    end
  end

  # React Native 0.87 and 0.88 build a static spm_dependency pod into the shared products directory
  # and rewrite the app's -fmodule-map-file flags to match, but assume the module is named like the
  # pod. The adyen_react_native module map then points to a path that does not exist
  # (facebook/react-native#59182 fixes this in later versions; the rewrite below is then a no-op).
  module ModuleMapReferences
    private

    def rewrite_aggregate_modulemap_references(installer, pod_names)
      super
      return unless pod_names.include?(POD_NAME)

      installer.aggregate_targets.each do |aggregate_target|
        aggregate_target.xcconfigs.each do |config_name, config_file|
          %w[OTHER_CFLAGS OTHER_SWIFT_FLAGS].each do |key|
            value = config_file.attributes[key]
            next unless value

            config_file.attributes[key] = value.gsub(
              "${PODS_CONFIGURATION_BUILD_DIR}/#{POD_NAME}/#{MODULE_NAME}.modulemap",
              "${PODS_CONFIGURATION_BUILD_DIR}/#{MODULE_NAME}.modulemap"
            )
          end
          config_file.save_as(aggregate_target.xcconfig_path(config_name))
        end
      end
    end
  end

  # A test bundle that links the pod as well as its host app (`inherit! :complete`) gives Xcode two
  # clients of the Adyen package products. Xcode then builds them as dynamic frameworks that nothing
  # links, and the app fails to link with undefined Adyen symbols.
  module Installer
    def perform_post_install_actions
      super
      aggregate_targets.each do |target|
        next unless target.pod_targets.any? { |pod| pod.pod_name == POD_NAME }
        next unless target.user_targets.any?(&:test_target_type?)

        Pod::UI.warn "[#{POD_NAME}] #{target.name} links #{POD_NAME} as well as its host app, so the app " \
                     "will fail to link with undefined Adyen symbols. Use `inherit! :search_paths` for test targets."
      end
    end
  end
end

Pod::AggregateTarget.prepend(AdyenSPMEmbed::AggregateTarget) unless Pod::AggregateTarget < AdyenSPMEmbed::AggregateTarget
Pod::Installer.prepend(AdyenSPMEmbed::Installer) unless Pod::Installer < AdyenSPMEmbed::Installer
if defined?(SPMManager) && SPMManager.private_method_defined?(:rewrite_aggregate_modulemap_references) &&
   !(SPMManager < AdyenSPMEmbed::ModuleMapReferences)
  SPMManager.prepend(AdyenSPMEmbed::ModuleMapReferences)
end
