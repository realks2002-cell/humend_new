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
        region.notifyOnEntry = true
        region.notifyOnExit = false

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
}
