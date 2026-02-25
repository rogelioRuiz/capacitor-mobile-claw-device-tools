require 'json'

package = JSON.parse(File.read(File.join(File.dirname(__FILE__), 'package.json')))

Pod::Spec.new do |s|
  s.name = 'CapacitorMobileClawDeviceTools'
  s.version = package['version']
  s.summary = package['description']
  s.license = package['license']
  s.homepage = package['homepage']
  s.author = package['author']
  s.source = { :git => package['repository']['url'], :tag => s.version.to_s }
  s.source_files = 'ios/Sources/**/*.swift'
  s.ios.deployment_target = '14.0'
  s.dependency 'Capacitor'
  s.dependency 'NMSSH', '~> 2.3'
  s.swift_version = '5.9'
end
