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
    static var locationDelegate: GeofenceLocationDelegate?
    static var activeLocationChecker: LocationChecker?
    static var activeArriveHelper: ArriveLocationHelper?
    static var activeArriveLocManager: CLLocationManager?

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

            // 200m 도착 감지 지오펜스 추가 등록
            let arriveRegion = CLCircularRegion(
                center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
                radius: min(200.0, AppDelegate.sharedLocationManager.maximumRegionMonitoringDistance),
                identifier: "arrive_\(shiftId)"
            )
            arriveRegion.notifyOnEntry = true
            arriveRegion.notifyOnExit = false
            AppDelegate.sharedLocationManager.startMonitoring(for: arriveRegion)

            // 좌표 저장 (arrive 성공 시 depart 지오펜스 등록에 사용)
            UserDefaults.standard.set(String(lat), forKey: "arrive_lat_\(shiftId)")
            UserDefaults.standard.set(String(lng), forKey: "arrive_lng_\(shiftId)")

            print("[GeofenceFCM] 지오펜스 등록: shift+arrive_\(shiftId) (\(lat),\(lng))")
            completionHandler(.newData)
            return
        }

        // 2층: location_check Silent Push — GPS 1회 획득 후 거리 체크
        if let type = userInfo["type"] as? String, type == "location_check",
           let latStr = userInfo["lat"] as? String,
           let lngStr = userInfo["lng"] as? String,
           let shiftId = userInfo["shiftId"] as? String,
           let targetLat = Double(latStr),
           let targetLng = Double(lngStr) {
            print("[LocationCheck] Silent Push 수신: shift_\(shiftId)")

            AppDelegate.activeLocationChecker = LocationChecker(targetLat: targetLat, targetLng: targetLng, shiftId: shiftId) {
                AppDelegate.activeLocationChecker = nil
                completionHandler(.newData)
            }
            AppDelegate.activeLocationChecker?.check()
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

        if region.identifier.hasPrefix("shift_") {
            let shiftId = String(region.identifier.dropFirst(6))
            callNearbyAPI(shiftId: shiftId)
            sendLocalNotification(shiftId: shiftId, title: "근무지 근처입니다", body: "출근 확인을 위해 앱을 열어주세요.")
        } else if region.identifier.hasPrefix("arrive_") {
            let shiftId = String(region.identifier.dropFirst(7))
            callArriveWithLocation(shiftId: shiftId)
        }

        // Capacitor JS에 이벤트 전달 (포그라운드일 때만)
        NotificationCenter.default.post(
            name: NSNotification.Name("GeofenceEnter"),
            object: nil,
            userInfo: ["identifier": region.identifier]
        )
    }

    func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
        guard region is CLCircularRegion else { return }
        print("[NativeGeofence] 이탈 감지: \(region.identifier)")

        if region.identifier.hasPrefix("depart_") {
            let shiftId = String(region.identifier.dropFirst(7))
            callDepartAPI(shiftId: shiftId)
            sendLocalNotification(shiftId: shiftId, title: "근무지를 이탈했습니다", body: "근무지로 복귀해주세요.")
        }
    }

    func locationManager(_ manager: CLLocationManager, monitoringDidFailFor region: CLRegion?, withError error: Error) {
        print("[NativeGeofence] 모니터링 에러: \(error.localizedDescription)")
    }

    func callNearbyAPIPublic(shiftId: String) { callNearbyAPI(shiftId: shiftId) }
    func callArriveWithLocationPublic(shiftId: String) { callArriveWithLocation(shiftId: shiftId) }
    func sendLocalNotificationPublic(shiftId: String, title: String = "근무지 근처입니다", body: String = "출근 확인을 위해 앱을 열어주세요.") {
        sendLocalNotification(shiftId: shiftId, title: title, body: body)
    }

    private func callNearbyAPI(shiftId: String) {
        guard let token = UserDefaults.standard.string(forKey: "supabase_access_token") else {
            print("[NativeGeofence] nearby API 실패: 토큰 없음")
            return
        }

        // 백그라운드 실행 시간 확보
        var bgTask: UIBackgroundTaskIdentifier = .invalid
        bgTask = UIApplication.shared.beginBackgroundTask {
            UIApplication.shared.endBackgroundTask(bgTask)
        }

        guard let url = URL(string: "https://humendhr.com/api/native/attendance/nearby") else {
            UIApplication.shared.endBackgroundTask(bgTask)
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["shiftId": shiftId])

        URLSession.shared.dataTask(with: request) { data, response, error in
            defer { UIApplication.shared.endBackgroundTask(bgTask) }
            if let error = error {
                print("[NativeGeofence] nearby API 에러: \(error.localizedDescription)")
                return
            }
            if let httpResponse = response as? HTTPURLResponse {
                print("[NativeGeofence] nearby API 응답: \(httpResponse.statusCode)")
            }
        }.resume()
    }

    /// 200m 진입 → GPS 1회 → arrive API (beginBackgroundTask 포함)
    private func callArriveWithLocation(shiftId: String) {
        var bgTask: UIBackgroundTaskIdentifier = .invalid
        bgTask = UIApplication.shared.beginBackgroundTask {
            UIApplication.shared.endBackgroundTask(bgTask)
        }

        let locManager = CLLocationManager()
        let arriveHelper = ArriveLocationHelper(shiftId: shiftId) { [weak self] lat, lng in
            self?.callAPI(
                path: "/api/native/attendance/arrive",
                body: ["shiftId": shiftId, "lat": lat, "lng": lng],
                label: "arrive"
            ) {
                // 도착 성공 → 이탈 감지 지오펜스 등록
                if let latStr = UserDefaults.standard.string(forKey: "arrive_lat_\(shiftId)"),
                   let lngStr = UserDefaults.standard.string(forKey: "arrive_lng_\(shiftId)"),
                   let workLat = Double(latStr), let workLng = Double(lngStr) {
                    let departRegion = CLCircularRegion(
                        center: CLLocationCoordinate2D(latitude: workLat, longitude: workLng),
                        radius: 500,
                        identifier: "depart_\(shiftId)"
                    )
                    departRegion.notifyOnEntry = false
                    departRegion.notifyOnExit = true
                    AppDelegate.sharedLocationManager.startMonitoring(for: departRegion)
                    print("[NativeGeofence] 이탈 감지 등록: depart_\(shiftId)")
                }
                self?.sendLocalNotification(shiftId: shiftId, title: "출근 처리되었습니다", body: "근무를 시작합니다.")
                UIApplication.shared.endBackgroundTask(bgTask)
            }
        } onFailure: {
            UIApplication.shared.endBackgroundTask(bgTask)
        }
        arriveHelper.requestLocation(manager: locManager)
        // retain
        AppDelegate.activeArriveHelper = arriveHelper
        AppDelegate.activeArriveLocManager = locManager
    }

    /// depart API 호출
    private func callDepartAPI(shiftId: String) {
        callAPI(path: "/api/native/attendance/depart", body: ["shiftId": shiftId], label: "depart")
    }

    /// 범용 API 호출 (beginBackgroundTask 포함)
    private func callAPI(path: String, body: [String: Any], label: String, completion: (() -> Void)? = nil) {
        guard let token = UserDefaults.standard.string(forKey: "supabase_access_token") else {
            print("[NativeGeofence] \(label) API 실패: 토큰 없음")
            completion?()
            return
        }

        var bgTask: UIBackgroundTaskIdentifier = .invalid
        bgTask = UIApplication.shared.beginBackgroundTask {
            UIApplication.shared.endBackgroundTask(bgTask)
        }

        guard let url = URL(string: "https://humendhr.com\(path)") else {
            UIApplication.shared.endBackgroundTask(bgTask)
            completion?()
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { _, response, error in
            defer {
                UIApplication.shared.endBackgroundTask(bgTask)
                completion?()
            }
            if let error = error {
                print("[NativeGeofence] \(label) API 에러: \(error.localizedDescription)")
                return
            }
            if let httpResponse = response as? HTTPURLResponse {
                print("[NativeGeofence] \(label) API 응답: \(httpResponse.statusCode)")
            }
        }.resume()
    }

    private func sendLocalNotification(shiftId: String, title: String = "근무지 근처입니다", body: String = "출근 확인을 위해 앱을 열어주세요.") {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.userInfo = ["shiftId": shiftId, "action": "open_for_arrival"]

        let request = UNNotificationRequest(
            identifier: "nearby_\(shiftId)",
            content: content,
            trigger: nil
        )
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("[NativeGeofence] 로컬 알림 에러: \(error.localizedDescription)")
            } else {
                print("[NativeGeofence] 로컬 알림 발송: nearby_\(shiftId)")
            }
        }
    }
}

// MARK: - Location Checker (2층: Silent Push → GPS 1회 → 거리 체크)
class LocationChecker: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    private let targetLat: Double
    private let targetLng: Double
    private let shiftId: String
    private let completion: () -> Void
    private var bgTask: UIBackgroundTaskIdentifier = .invalid

    init(targetLat: Double, targetLng: Double, shiftId: String, completion: @escaping () -> Void) {
        self.targetLat = targetLat
        self.targetLng = targetLng
        self.shiftId = shiftId
        self.completion = completion
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }

    func check() {
        bgTask = UIApplication.shared.beginBackgroundTask { [weak self] in
            self?.finish()
        }
        manager.requestLocation()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.last else { finish(); return }

        let distance = haversine(lat1: loc.coordinate.latitude, lng1: loc.coordinate.longitude,
                                 lat2: targetLat, lng2: targetLng)
        print("[LocationCheck] 현재 거리: \(Int(distance))m (shift: \(shiftId))")

        if distance <= 200 {
            // 200m 이내 → nearby + arrive 둘 다 호출
            AppDelegate.locationDelegate?.sendLocalNotificationPublic(shiftId: shiftId, title: "출근 처리되었습니다", body: "근무를 시작합니다.")
            callNearbyAndArriveAndFinish(shiftId: shiftId, lat: loc.coordinate.latitude, lng: loc.coordinate.longitude)
        } else if distance <= 2000 {
            // 2km 이내 → nearby만
            AppDelegate.locationDelegate?.sendLocalNotificationPublic(shiftId: shiftId)
            callNearbyAndFinish(shiftId: shiftId)
        } else {
            finish()
        }
    }

    private func callNearbyAndFinish(shiftId: String) {
        guard let token = UserDefaults.standard.string(forKey: "supabase_access_token") else {
            finish()
            return
        }
        guard let url = URL(string: "https://humendhr.com/api/native/attendance/nearby") else {
            finish()
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["shiftId": shiftId])

        URLSession.shared.dataTask(with: request) { [weak self] _, response, error in
            if let error = error {
                print("[LocationCheck] nearby API 에러: \(error.localizedDescription)")
            } else if let httpResponse = response as? HTTPURLResponse {
                print("[LocationCheck] nearby API 응답: \(httpResponse.statusCode)")
            }
            self?.finish()
        }.resume()
    }

    private func callNearbyAndArriveAndFinish(shiftId: String, lat: Double, lng: Double) {
        guard let token = UserDefaults.standard.string(forKey: "supabase_access_token") else {
            finish()
            return
        }
        guard let nearbyUrl = URL(string: "https://humendhr.com/api/native/attendance/nearby") else {
            finish()
            return
        }
        var nearbyReq = URLRequest(url: nearbyUrl)
        nearbyReq.httpMethod = "POST"
        nearbyReq.setValue("application/json", forHTTPHeaderField: "Content-Type")
        nearbyReq.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        nearbyReq.httpBody = try? JSONSerialization.data(withJSONObject: ["shiftId": shiftId])

        URLSession.shared.dataTask(with: nearbyReq) { [weak self] _, _, _ in
            guard let arriveUrl = URL(string: "https://humendhr.com/api/native/attendance/arrive") else {
                self?.finish()
                return
            }
            var arriveReq = URLRequest(url: arriveUrl)
            arriveReq.httpMethod = "POST"
            arriveReq.setValue("application/json", forHTTPHeaderField: "Content-Type")
            arriveReq.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            arriveReq.httpBody = try? JSONSerialization.data(withJSONObject: ["shiftId": shiftId, "lat": lat, "lng": lng])

            URLSession.shared.dataTask(with: arriveReq) { _, response, error in
                if let error = error {
                    print("[LocationCheck] arrive API 에러: \(error.localizedDescription)")
                } else if let httpResponse = response as? HTTPURLResponse {
                    print("[LocationCheck] arrive API 응답: \(httpResponse.statusCode)")
                }
                self?.finish()
            }.resume()
        }.resume()
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("[LocationCheck] GPS 에러: \(error.localizedDescription)")
        finish()
    }

    private func finish() {
        completion()
        UIApplication.shared.endBackgroundTask(bgTask)
    }

    private func haversine(lat1: Double, lng1: Double, lat2: Double, lng2: Double) -> Double {
        let R = 6371000.0
        let dLat = (lat2 - lat1) * .pi / 180
        let dLng = (lng2 - lng1) * .pi / 180
        let a = sin(dLat/2) * sin(dLat/2) +
                cos(lat1 * .pi / 180) * cos(lat2 * .pi / 180) * sin(dLng/2) * sin(dLng/2)
        return R * 2 * atan2(sqrt(a), sqrt(1 - a))
    }
}

// MARK: - Arrive Location Helper (200m 진입 시 GPS 1회 → arrive API)
class ArriveLocationHelper: NSObject, CLLocationManagerDelegate {
    private let shiftId: String
    private let onSuccess: (Double, Double) -> Void
    private let onFailure: () -> Void
    private var manager: CLLocationManager?

    init(shiftId: String, onSuccess: @escaping (Double, Double) -> Void, onFailure: @escaping () -> Void) {
        self.shiftId = shiftId
        self.onSuccess = onSuccess
        self.onFailure = onFailure
        super.init()
    }

    func requestLocation(manager: CLLocationManager) {
        self.manager = manager
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.requestLocation()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.last else { cleanup(); onFailure(); return }
        print("[ArriveHelper] GPS 획득: \(loc.coordinate.latitude),\(loc.coordinate.longitude)")
        onSuccess(loc.coordinate.latitude, loc.coordinate.longitude)
        cleanup()
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("[ArriveHelper] GPS 에러: \(error.localizedDescription)")
        onFailure()
        cleanup()
    }

    private func cleanup() {
        manager = nil
        AppDelegate.activeArriveHelper = nil
        AppDelegate.activeArriveLocManager = nil
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
