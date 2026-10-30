import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // Pede o token APNs já na abertura (o firebase_messaging depende dele).
    application.registerForRemoteNotifications()
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Diagnóstico: mostra no console do Xcode por que a Apple recusou o registro
  // de push (ex.: "no valid aps-environment entitlement string found").
  override func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    print("APNs: falha ao registrar para push: \(error)")
    super.application(application, didFailToRegisterForRemoteNotificationsWithError: error)
  }

  override func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    print("APNs: token recebido (\(deviceToken.count) bytes)")
    super.application(application, didRegisterForRemoteNotificationsWithDeviceToken: deviceToken)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
  }
}
