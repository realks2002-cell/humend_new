import UIKit
import WebKit
import Capacitor
import CoreLocation
#if canImport(FirebaseCore)
import FirebaseCore
import FirebaseMessaging
#endif

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    static var pendingFCMToken: String?

    // 앱 전체에서 공유하는 CLLocationManager (NativeGeofencePlugin에서도 사용)
    static let sharedLocationManager: CLLocationManager = CLLocationManager()
    private static var locationDelegate: GeofenceLocationDelegate?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        #if canImport(FirebaseCore)
        FirebaseApp.configure()
        Messaging.messaging().delegate = self
        #endif

        // CLLocationManager delegate 설정
        AppDelegate.locationDelegate = GeofenceLocationDelegate()
        AppDelegate.sharedLocationManager.delegate = AppDelegate.locationDelegate

        UNUserNotificationCenter.current().delegate = self

        // WKWebView 설정
        setupWebView()

        return true
    }

    private func setupWebView() {
        guard let window = self.window,
              let rootVC = window.rootViewController,
              let webView = findWebView(in: rootVC.view) else {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
                self?.setupWebView()
            }
            return
        }
        webView.allowsBackForwardNavigationGestures = true
    }

    private func findWebView(in view: UIView) -> WKWebView? {
        if let webView = view as? WKWebView { return webView }
        for subview in view.subviews {
            if let found = findWebView(in: subview) { return found }
        }
        return nil
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        #if canImport(FirebaseMessaging)
        Messaging.messaging().apnsToken = deviceToken
        Messaging.messaging().token { token, error in
            if let token = token {
                print("[Firebase] FCM token (from apns): \(token)")
                AppDelegate.pendingFCMToken = token
                NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: token)
            } else if let error = error {
                print("[Firebase] FCM token error: \(error)")
            }
        }
        #else
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
        #endif
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    // FCM 수신 (백그라운드 포함) — 지오펜스 등록
    func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable: Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        // FCM data는 userInfo 최상위에 위치
        if let type = userInfo["type"] as? String, type == "geofence_register",
           let latStr = userInfo["lat"] as? String,
           let lngStr = userInfo["lng"] as? String,
           let shiftId = userInfo["shiftId"] as? String,
           let lat = Double(latStr),
           let lng = Double(lngStr) {
            let radiusStr = userInfo["radius"] as? String ?? "2000"
            let radius = min(Double(radiusStr) ?? 2000.0, AppDelegate.sharedLocationManager.maximumRegionMonitoringDistance)

            let region = CLCircularRegion(
                center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
                radius: radius,
                identifier: "shift_\(shiftId)"
            )
            region.notifyOnEntry = true
            region.notifyOnExit = false

            AppDelegate.sharedLocationManager.startMonitoring(for: region)
            print("[GeofenceFCM] 지오펜스 등록: shift_\(shiftId) (\(lat),\(lng) r=\(radius)m)")
            completionHandler(.newData)
            return
        }
        completionHandler(.noData)
    }
}

// MARK: - Geofence Location Delegate (공유)
class GeofenceLocationDelegate: NSObject, CLLocationManagerDelegate {
    func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
        guard region is CLCircularRegion else { return }
        print("[NativeGeofence] 진입 감지: \(region.identifier)")
        // Capacitor JS에 이벤트 전달
        NotificationCenter.default.post(
            name: NSNotification.Name("GeofenceEnter"),
            object: nil,
            userInfo: ["identifier": region.identifier]
        )
    }

    func locationManager(_ manager: CLLocationManager, monitoringDidFailFor region: CLRegion?, withError error: Error) {
        print("[NativeGeofence] 모니터링 에러: \(error.localizedDescription)")
    }
}

// MARK: - Firebase Messaging Delegate
#if canImport(FirebaseMessaging)
extension AppDelegate: MessagingDelegate {
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        print("[Firebase] FCM token: \(token)")
        AppDelegate.pendingFCMToken = token
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: token)
    }
}
#endif

// MARK: - Notification Center Delegate
extension AppDelegate: UNUserNotificationCenterDelegate {
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.badge, .sound, .banner])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        completionHandler()
    }
}
