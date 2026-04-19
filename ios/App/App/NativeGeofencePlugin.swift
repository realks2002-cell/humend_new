import Foundation
import Capacitor
import CoreLocation

@objc(NativeGeofencePlugin)
public class NativeGeofencePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeGeofencePlugin"
    public let jsName = "NativeGeofence"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "register", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removeAll", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setAuthToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setApiKey", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isBatteryOptimizationIgnored", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestBatteryOptimizationExemption", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startPeriodicLocationBackup", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopPeriodicLocationBackup", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAlwaysAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getAuthorizationStatus", returnType: CAPPluginReturnPromise),
    ]

    private var geofenceObserver: NSObjectProtocol?

    override public func load() {
        // AppDelegate의 GeofenceLocationDelegate가 보내는 NotificationCenter 이벤트 구독
        geofenceObserver = NotificationCenter.default.addObserver(
            forName: NSNotification.Name("GeofenceEnter"),
            object: nil,
            queue: .main
        ) { [weak self] notification in
            if let identifier = notification.userInfo?["identifier"] as? String {
                self?.notifyListeners("geofenceEnter", data: ["identifier": identifier])
            }
        }
    }

    deinit {
        if let observer = geofenceObserver {
            NotificationCenter.default.removeObserver(observer)
        }
    }

    @objc func register(_ call: CAPPluginCall) {
        guard let lat = call.getDouble("latitude"),
              let lng = call.getDouble("longitude"),
              let radius = call.getDouble("radius"),
              let identifier = call.getString("identifier") else {
            call.reject("latitude, longitude, radius, identifier 필수")
            return
        }

        let manager = AppDelegate.sharedLocationManager
        let region = CLCircularRegion(
            center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
            radius: min(radius, manager.maximumRegionMonitoringDistance),
            identifier: identifier
        )
        let isDepart = identifier.hasPrefix("depart_")
        region.notifyOnEntry = !isDepart
        region.notifyOnExit = isDepart

        manager.startMonitoring(for: region)
        print("[NativeGeofence] 등록: \(identifier) (\(lat),\(lng) r=\(radius)m)")
        call.resolve(["success": true])
    }

    @objc func remove(_ call: CAPPluginCall) {
        guard let identifier = call.getString("identifier") else {
            call.reject("identifier 필수")
            return
        }

        let manager = AppDelegate.sharedLocationManager
        for region in manager.monitoredRegions {
            if region.identifier == identifier {
                manager.stopMonitoring(for: region)
                print("[NativeGeofence] 제거: \(identifier)")
                break
            }
        }
        call.resolve(["success": true])
    }

    @objc func setAuthToken(_ call: CAPPluginCall) {
        guard let token = call.getString("token") else {
            call.reject("token 필수")
            return
        }
        UserDefaults.standard.set(token, forKey: "supabase_access_token")
        print("[NativeGeofence] auth token 저장됨")
        call.resolve(["success": true])
    }

    @objc func setApiKey(_ call: CAPPluginCall) {
        guard let apiKey = call.getString("apiKey") else {
            call.reject("apiKey 필수")
            return
        }
        UserDefaults.standard.set(apiKey, forKey: "member_api_key")
        print("[NativeGeofence] api key 저장됨")
        call.resolve(["success": true])
    }

    @objc func isBatteryOptimizationIgnored(_ call: CAPPluginCall) {
        // iOS는 배터리 최적화 개념이 Android와 다름 — 항상 true 반환
        call.resolve(["ignored": true])
    }

    @objc func requestBatteryOptimizationExemption(_ call: CAPPluginCall) {
        // iOS 미지원 — no-op
        call.resolve(["success": true])
    }

    @objc func startPeriodicLocationBackup(_ call: CAPPluginCall) {
        // iOS는 WorkManager 없음 — Silent Push + 지오펜스로 대체
        call.resolve(["success": true])
    }

    @objc func stopPeriodicLocationBackup(_ call: CAPPluginCall) {
        call.resolve(["success": true])
    }

    @objc func removeAll(_ call: CAPPluginCall) {
        let manager = AppDelegate.sharedLocationManager
        for region in manager.monitoredRegions {
            if region.identifier.hasPrefix("shift_") {
                manager.stopMonitoring(for: region)
            }
        }
        print("[NativeGeofence] 전체 제거")
        call.resolve(["success": true])
    }

    /// iOS CLLocationManager.requestAlwaysAuthorization() 직접 호출
    /// - notDetermined: When In Use 팝업 → 선택 후 Always 업그레이드 팝업 자동 표시
    /// - authorizedWhenInUse: Always 업그레이드 팝업 즉시 표시
    @objc func requestAlwaysAuthorization(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            AppDelegate.sharedLocationManager.requestAlwaysAuthorization()
            print("[NativeGeofence] requestAlwaysAuthorization 호출")
            call.resolve(["success": true])
        }
    }

    /// 현재 위치 권한 상태 반환
    @objc func getAuthorizationStatus(_ call: CAPPluginCall) {
        let status: CLAuthorizationStatus
        if #available(iOS 14.0, *) {
            status = AppDelegate.sharedLocationManager.authorizationStatus
        } else {
            status = CLLocationManager.authorizationStatus()
        }

        let statusStr: String
        switch status {
        case .notDetermined: statusStr = "notDetermined"
        case .restricted: statusStr = "restricted"
        case .denied: statusStr = "denied"
        case .authorizedWhenInUse: statusStr = "whenInUse"
        case .authorizedAlways: statusStr = "always"
        @unknown default: statusStr = "unknown"
        }
        call.resolve(["status": statusStr])
    }
}
