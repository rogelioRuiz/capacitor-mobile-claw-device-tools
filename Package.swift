// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapacitorMobileClawDeviceTools",
    platforms: [.iOS(.v14)],
    products: [
        .library(
            name: "CapacitorMobileClawDeviceTools",
            targets: ["NetworkToolsPlugin"]
        )
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0"),
        .package(url: "https://github.com/apple/swift-nio-ssh.git", from: "0.9.0"),
        .package(url: "https://github.com/apple/swift-nio-transport-services.git", from: "1.15.0"),
    ],
    targets: [
        .target(
            name: "NetworkToolsPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "NIOSSH", package: "swift-nio-ssh"),
                .product(name: "NIOTransportServices", package: "swift-nio-transport-services"),
            ],
            path: "ios/Sources/NetworkToolsPlugin"
        )
    ]
)
