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
    // 3-샘플 재시도 중인 helper/manager 보관 (서버 arrive debounce 충족용)
    static var activeArriveHelpers: [ArriveLocationHelper] = []
    static var activeArriveLocManagers: [CLLocationManager] = []

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

            // 5km 접근 감지 (3레이어 안전장치 Layer 1)
            let approachRegion = CLCircularRegion(
                center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
                radius: min(5000.0, AppDelegate.sharedLocationManager.maximumRegionMonitoringDistance),
                identifier: "approach_\(shiftId)"
            )
            approachRegion.notifyOnEntry = true
            approachRegion.notifyOnExit = false
            AppDelegate.sharedLocationManager.startMonitoring(for: approachRegion)
            AppDelegate.sharedLocationManager.requestState(for: approachRegion)

            // 4km 접근 백업 (5km 누락 대비)
            let approach2Region = CLCircularRegion(
                center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
                radius: min(4000.0, AppDelegate.sharedLocationManager.maximumRegionMonitoringDistance),
                identifier: "approach2_\(shiftId)"
            )
            approach2Region.notifyOnEntry = true
            approach2Region.notifyOnExit = false
            AppDelegate.sharedLocationManager.startMonitoring(for: approach2Region)
            AppDelegate.sharedLocationManager.requestState(for: approach2Region)

            // 3km 접근 백업 (4km까지 누락 대비)
            let approach3Region = CLCircularRegion(
                center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
                radius: min(3000.0, AppDelegate.sharedLocationManager.maximumRegionMonitoringDistance),
                identifier: "approach3_\(shiftId)"
            )
            approach3Region.notifyOnEntry = true
            approach3Region.notifyOnExit = false
            AppDelegate.sharedLocationManager.startMonitoring(for: approach3Region)
            AppDelegate.sharedLocationManager.requestState(for: approach3Region)

            // 2km 근접 감지
            let region = CLCircularRegion(
                center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
                radius: radius,
                identifier: "shift_\(shiftId)"
            )
            region.notifyOnEntry = true
            region.notifyOnExit = false
            AppDelegate.sharedLocationManager.startMonitoring(for: region)
            AppDelegate.sharedLocationManager.requestState(for: region)

            // 500m 도착 감지 지오펜스 (실내 진입 전 포착)
            let arriveRegion = CLCircularRegion(
                center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
                radius: min(500.0, AppDelegate.sharedLocationManager.maximumRegionMonitoringDistance),
                identifier: "arrive_\(shiftId)"
            )
            arriveRegion.notifyOnEntry = true
            arriveRegion.notifyOnExit = false
            AppDelegate.sharedLocationManager.startMonitoring(for: arriveRegion)
            AppDelegate.sharedLocationManager.requestState(for: arriveRegion)

            // 좌표 저장 (arrive 성공 시 depart 지오펜스 등록에 사용)
            UserDefaults.standard.set(String(lat), forKey: "arrive_lat_\(shiftId)")
            UserDefaults.standard.set(String(lng), forKey: "arrive_lng_\(shiftId)")

            print("[GeofenceFCM] 지오펜스 등록: approach(5/4/3km)+shift+arrive_\(shiftId) (\(lat),\(lng))")
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

        if region.identifier.hasPrefix("approach_") {
            let shiftId = String(region.identifier.dropFirst(9))
            callApproachingAPI(shiftId: shiftId)
        } else if region.identifier.hasPrefix("approach2_") {
            // 4km 백업 진입 — 서버가 approaching_at 중복 무시
            let shiftId = String(region.identifier.dropFirst(10))
            callApproachingAPI(shiftId: shiftId)
        } else if region.identifier.hasPrefix("approach3_") {
            // 3km 백업 진입
            let shiftId = String(region.identifier.dropFirst(10))
            callApproachingAPI(shiftId: shiftId)
        } else if region.identifier.hasPrefix("shift_") {
            let shiftId = String(region.identifier.dropFirst(6))
            callNearbyAPI(shiftId: shiftId)
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
        }
    }

    /// 지오펜스 등록 시 현재 상태 확인 — 이미 내부면 수동으로 ENTER 처리
    func locationManager(_ manager: CLLocationManager, didDetermineState state: CLRegionState, for region: CLRegion) {
        guard state == .inside, region is CLCircularRegion else { return }
        print("[NativeGeofence] 이미 내부: \(region.identifier)")

        if region.identifier.hasPrefix("approach2_") {
            let shiftId = String(region.identifier.dropFirst(10))
            callApproachingAPI(shiftId: shiftId)
        } else if region.identifier.hasPrefix("approach3_") {
            let shiftId = String(region.identifier.dropFirst(10))
            callApproachingAPI(shiftId: shiftId)
        } else if region.identifier.hasPrefix("approach_") {
            let shiftId = String(region.identifier.dropFirst(9))
            callApproachingAPI(shiftId: shiftId)
        } else if region.identifier.hasPrefix("arrive_") {
            let shiftId = String(region.identifier.dropFirst(7))
            callArriveWithLocation(shiftId: shiftId)
        } else if region.identifier.hasPrefix("shift_") {
            let shiftId = String(region.identifier.dropFirst(6))
            callNearbyAPI(shiftId: shiftId)
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
        guard LocationChecker.setAuthHeader(on: &request) else {
            print("[NativeGeofence] nearby API 실패: 인증 없음")
            UIApplication.shared.endBackgroundTask(bgTask)
            return
        }
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

    /// 5km 접근 감지 API 호출 (3레이어 안전장치 Layer 1)
    private func callApproachingAPI(shiftId: String) {
        var bgTask: UIBackgroundTaskIdentifier = .invalid
        bgTask = UIApplication.shared.beginBackgroundTask {
            UIApplication.shared.endBackgroundTask(bgTask)
        }

        guard let url = URL(string: "https://humendhr.com/api/native/attendance/approaching") else {
            UIApplication.shared.endBackgroundTask(bgTask)
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        guard LocationChecker.setAuthHeader(on: &request) else {
            print("[NativeGeofence] approaching API 실패: 인증 없음")
            UIApplication.shared.endBackgroundTask(bgTask)
            return
        }
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["shiftId": shiftId])

        URLSession.shared.dataTask(with: request) { _, response, error in
            defer { UIApplication.shared.endBackgroundTask(bgTask) }
            if let error = error {
                print("[NativeGeofence] approaching API 에러: \(error.localizedDescription)")
                return
            }
            if let httpResponse = response as? HTTPURLResponse {
                print("[NativeGeofence] approaching API 응답: \(httpResponse.statusCode)")
            }
        }.resume()
    }

    /// arrive 반경 진입 → 6초 간격 3샘플 생성 (서버 arrive debounce 3회 연속 충족용)
    private func callArriveWithLocation(shiftId: String) {
        scheduleArriveSample(shiftId: shiftId, delaySec: 0, isFirst: true)
        scheduleArriveSample(shiftId: shiftId, delaySec: 6, isFirst: false)
        scheduleArriveSample(shiftId: shiftId, delaySec: 12, isFirst: false)
    }

    private func scheduleArriveSample(shiftId: String, delaySec: Int, isFirst: Bool) {
        var bgTask: UIBackgroundTaskIdentifier = .invalid
        bgTask = UIApplication.shared.beginBackgroundTask {
            UIApplication.shared.endBackgroundTask(bgTask)
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + .seconds(delaySec)) { [weak self] in
            guard let self = self else {
                UIApplication.shared.endBackgroundTask(bgTask)
                return
            }
            let locManager = CLLocationManager()
            let arriveHelper = ArriveLocationHelper(shiftId: shiftId) { [weak self] lat, lng in
                self?.callAPI(
                    path: "/api/native/attendance/arrive",
                    body: ["shiftId": shiftId, "lat": lat, "lng": lng],
                    label: "arrive(sample+\(delaySec)s)"
                ) {
                    if isFirst {
                        // 첫 샘플에서만 이탈 감지 지오펜스 등록
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
                    }
                    UIApplication.shared.endBackgroundTask(bgTask)
                }
            } onFailure: {
                UIApplication.shared.endBackgroundTask(bgTask)
            }
            arriveHelper.requestLocation(manager: locManager)
            // retain (ARC 해제 방지)
            AppDelegate.activeArriveHelpers.append(arriveHelper)
            AppDelegate.activeArriveLocManagers.append(locManager)
            AppDelegate.activeArriveHelper = arriveHelper
            AppDelegate.activeArriveLocManager = locManager
        }
    }

    /// depart API 호출
    private func callDepartAPI(shiftId: String) {
        callAPI(path: "/api/native/attendance/depart", body: ["shiftId": shiftId], label: "depart")
    }

    /// 범용 API 호출 (beginBackgroundTask 포함)
    private func callAPI(path: String, body: [String: Any], label: String, completion: (() -> Void)? = nil) {
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
        guard LocationChecker.setAuthHeader(on: &request) else {
            print("[NativeGeofence] \(label) API 실패: 인증 없음")
            UIApplication.shared.endBackgroundTask(bgTask)
            completion?()
            return
        }
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
    private var attemptCount = 0
    private let maxAttempts = 3
    private let maxAcceptableAccuracy: CLLocationAccuracy = 500
    private var timeoutWorkItem: DispatchWorkItem?
    private var finished = false

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
        startAttempt()
    }

    private func startAttempt() {
        attemptCount += 1
        print("[LocationCheck] 시도 \(attemptCount)/\(maxAttempts)")
        manager.requestLocation()
        timeoutWorkItem?.cancel()
        let item = DispatchWorkItem { [weak self] in self?.handleTimeout() }
        timeoutWorkItem = item
        DispatchQueue.main.asyncAfter(deadline: .now() + 10, execute: item)
    }

    private func handleTimeout() {
        guard !finished else { return }
        guard attemptCount < maxAttempts else {
            print("[LocationCheck] 타임아웃 — 포기")
            finish()
            return
        }
        startAttempt()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard !finished else { return }
        guard let loc = locations.last else { handleTimeout(); return }

        // 정확도 필터
        if loc.horizontalAccuracy > 0 && loc.horizontalAccuracy > maxAcceptableAccuracy {
            print("[LocationCheck] 정확도 부족 (\(Int(loc.horizontalAccuracy))m) — 재시도")
            handleTimeout()
            return
        }

        timeoutWorkItem?.cancel()
        let distance = haversine(lat1: loc.coordinate.latitude, lng1: loc.coordinate.longitude,
                                 lat2: targetLat, lng2: targetLng)
        print("[LocationCheck] 거리: \(Int(distance))m, 정확도: \(Int(loc.horizontalAccuracy))m")

        if distance <= 300 {
            callNearbyAndArriveAndFinish(shiftId: shiftId, lat: loc.coordinate.latitude, lng: loc.coordinate.longitude)
        } else if distance <= 2000 {
            callNearbyAndFinish(shiftId: shiftId)
        } else if distance <= 5000 {
            callApproachingAndFinish(shiftId: shiftId)
        } else {
            finish()
        }
    }

    /// API Key 우선, Bearer 토큰 fallback
    static func setAuthHeader(on request: inout URLRequest) -> Bool {
        if let apiKey = UserDefaults.standard.string(forKey: "member_api_key") {
            request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
            return true
        }
        if let token = UserDefaults.standard.string(forKey: "supabase_access_token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            return true
        }
        return false
    }

    private func callNearbyAndFinish(shiftId: String) {
        guard let url = URL(string: "https://humendhr.com/api/native/attendance/nearby") else {
            finish()
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        guard LocationChecker.setAuthHeader(on: &request) else { finish(); return }
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

    private func callApproachingAndFinish(shiftId: String) {
        guard let url = URL(string: "https://humendhr.com/api/native/attendance/approaching") else {
            finish()
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        guard LocationChecker.setAuthHeader(on: &request) else { finish(); return }
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["shiftId": shiftId])

        URLSession.shared.dataTask(with: request) { [weak self] _, response, error in
            if let httpResponse = response as? HTTPURLResponse {
                print("[LocationCheck] approaching API 응답: \(httpResponse.statusCode)")
            }
            self?.finish()
        }.resume()
    }

    private func callNearbyAndArriveAndFinish(shiftId: String, lat: Double, lng: Double) {
        guard let nearbyUrl = URL(string: "https://humendhr.com/api/native/attendance/nearby") else {
            finish()
            return
        }
        var nearbyReq = URLRequest(url: nearbyUrl)
        nearbyReq.httpMethod = "POST"
        nearbyReq.setValue("application/json", forHTTPHeaderField: "Content-Type")
        guard LocationChecker.setAuthHeader(on: &nearbyReq) else { finish(); return }
        nearbyReq.httpBody = try? JSONSerialization.data(withJSONObject: ["shiftId": shiftId])

        URLSession.shared.dataTask(with: nearbyReq) { [weak self] _, _, _ in
            // 1차 arrive 샘플
            LocationChecker.postArriveSample(shiftId: shiftId, lat: lat, lng: lng, label: "1/3")
            // 2차/3차 샘플은 별도 background task로 스케줄 (6초/12초 후)
            LocationChecker.scheduleDeferredArriveSample(shiftId: shiftId, lat: lat, lng: lng, delaySec: 6, label: "2/3")
            LocationChecker.scheduleDeferredArriveSample(shiftId: shiftId, lat: lat, lng: lng, delaySec: 12, label: "3/3")
            self?.finish()
        }.resume()
    }

    /** arrive API 단일 샘플 전송 (동기 함수지만 URLSession dataTask 비동기 발송) */
    static func postArriveSample(shiftId: String, lat: Double, lng: Double, label: String) {
        guard let url = URL(string: "https://humendhr.com/api/native/attendance/arrive") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        guard LocationChecker.setAuthHeader(on: &req) else { return }
        req.httpBody = try? JSONSerialization.data(withJSONObject: ["shiftId": shiftId, "lat": lat, "lng": lng])
        URLSession.shared.dataTask(with: req) { _, response, error in
            if let error = error {
                print("[LocationCheck] arrive(\(label)) 에러: \(error.localizedDescription)")
            } else if let httpResponse = response as? HTTPURLResponse {
                print("[LocationCheck] arrive(\(label)) 응답: \(httpResponse.statusCode)")
            }
        }.resume()
    }

    /** DispatchQueue 지연 후 arrive 샘플 전송 (자체 backgroundTask 관리) */
    static func scheduleDeferredArriveSample(shiftId: String, lat: Double, lng: Double, delaySec: Int, label: String) {
        var bgTask: UIBackgroundTaskIdentifier = .invalid
        bgTask = UIApplication.shared.beginBackgroundTask {
            UIApplication.shared.endBackgroundTask(bgTask)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + .seconds(delaySec)) {
            LocationChecker.postArriveSample(shiftId: shiftId, lat: lat, lng: lng, label: label)
            // URLSession dataTask 완료 대기 후 해제 (간단히 타이머로 5초 뒤 해제)
            DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
                if bgTask != .invalid {
                    UIApplication.shared.endBackgroundTask(bgTask)
                    bgTask = .invalid
                }
            }
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        guard !finished else { return }
        print("[LocationCheck] GPS 에러: \(error.localizedDescription)")
        handleTimeout()
    }

    private func finish() {
        guard !finished else { return }
        finished = true
        timeoutWorkItem?.cancel()
        manager.delegate = nil
        completion()
        if bgTask != .invalid {
            UIApplication.shared.endBackgroundTask(bgTask)
            bgTask = .invalid
        }
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

// MARK: - Arrive Location Helper (500m 진입 시 GPS → arrive API, WiFi/셀룰러 활용)
class ArriveLocationHelper: NSObject, CLLocationManagerDelegate {
    private let shiftId: String
    private let onSuccess: (Double, Double) -> Void
    private let onFailure: () -> Void
    private var manager: CLLocationManager?
    private var attemptCount = 0
    private var timeoutWorkItem: DispatchWorkItem?
    private let maxAttempts = 3
    private let maxAcceptableAccuracy: CLLocationAccuracy = 500
    private var finished = false

    init(shiftId: String, onSuccess: @escaping (Double, Double) -> Void, onFailure: @escaping () -> Void) {
        self.shiftId = shiftId
        self.onSuccess = onSuccess
        self.onFailure = onFailure
        super.init()
    }

    func requestLocation(manager: CLLocationManager) {
        self.manager = manager
        manager.delegate = self
        // WiFi + 셀룰러 포함 (실내 감지용)
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        startAttempt()
    }

    private func startAttempt() {
        attemptCount += 1
        print("[ArriveHelper] 시도 \(attemptCount)/\(maxAttempts)")
        manager?.requestLocation()

        // 10초 타임아웃 후 재시도
        timeoutWorkItem?.cancel()
        let item = DispatchWorkItem { [weak self] in self?.handleTimeout() }
        timeoutWorkItem = item
        DispatchQueue.main.asyncAfter(deadline: .now() + 10, execute: item)
    }

    private func handleTimeout() {
        guard !finished else { return }
        guard attemptCount < maxAttempts else {
            print("[ArriveHelper] 타임아웃 — 최대 시도 초과")
            finished = true
            onFailure()
            cleanup()
            return
        }
        startAttempt()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard !finished else { return }
        guard let loc = locations.last else {
            handleTimeout()
            return
        }
        print("[ArriveHelper] GPS: \(loc.coordinate.latitude),\(loc.coordinate.longitude) acc=\(Int(loc.horizontalAccuracy))m")

        // 정확도 필터 — 500m 이하만 수용
        if loc.horizontalAccuracy > 0 && loc.horizontalAccuracy <= maxAcceptableAccuracy {
            finished = true
            timeoutWorkItem?.cancel()
            onSuccess(loc.coordinate.latitude, loc.coordinate.longitude)
            cleanup()
        } else {
            print("[ArriveHelper] 정확도 부족 (\(Int(loc.horizontalAccuracy))m > \(Int(maxAcceptableAccuracy))m) — 재시도")
            handleTimeout()
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        guard !finished else { return }
        print("[ArriveHelper] GPS 에러: \(error.localizedDescription)")
        handleTimeout()
    }

    private func cleanup() {
        timeoutWorkItem?.cancel()
        timeoutWorkItem = nil
        manager?.delegate = nil
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
