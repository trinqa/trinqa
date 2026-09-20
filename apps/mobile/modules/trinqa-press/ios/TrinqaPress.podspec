require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'TrinqaPress'
  s.version        = package['version']
  s.summary        = 'SwiftUI press ButtonStyle for Trinqa custom-content buttons'
  s.description    = s.summary
  s.license        = 'UNLICENSED'
  s.author         = 'Trinqa'
  s.homepage       = 'https://trinqa.com'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.dependency 'ExpoUI'
  s.source_files = '*.{swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }
end
