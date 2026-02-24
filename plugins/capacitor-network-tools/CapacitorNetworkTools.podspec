require 'json'

package = JSON.parse(File.read(File.join(File.dirname(__FILE__), 'package.json')))

Pod::Spec.new do |s|
  s.name = 'CapacitorNetworkTools'
  s.version = package['version']
  s.summary = package['description']
  s.license = package['license']
  s.homepage = 'https://github.com/t6x/capacitor-network-tools'
  s.author = 'T6X'
  s.source = { :git => 'https://github.com/t6x/capacitor-network-tools.git', :tag => s.version.to_s }
  s.source_files = 'ios/Sources/**/*.swift'
  s.ios.deployment_target = '14.0'
  s.dependency 'Capacitor'
  s.dependency 'NMSSH', '~> 2.3'
  s.swift_version = '5.9'
end
