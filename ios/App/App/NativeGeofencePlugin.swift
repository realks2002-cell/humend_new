import Foundation
import Capacitor
import CoreLocation

@objc(NativeGeofencePlugin)
public class NativeGeofencePlugin: CAPPlugin, CAPBridgedPlugin, CLLocationManagerDelegate {
    public let identifier = "NativeGeofencePlugin"
    public let jsName = "NativeGeofence"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "register", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removeAll", returnType: CAPPluginReturnPromise),
    ]

    private lazy var locationManager: CLLocationManager = {
        let manager = CLLocationManager()
        manager.delegate = self
        return manager
    }()

    @objc func register(_ call: CAPPluginCall) {
        guard let lat = call.getDouble("latitude"),
              let lng = call.getDouble("longitude"),
              let radius = call.getDouble("radius"),
              let identifier = call.getString("identifier") else {
            call.reject("latitude, longitude, radius, identifier 필수")
            return
        }

        let region = CLCircularRegion(
            center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
            radius: min(radius, locationManager.maximumRegionMonitoringDistance),
            identifier: identifier
        )
        region.notifyOnEntry = true
        region.notifyOnExit = false

        locationManager.startMonitoring(for: region)
        print("[NativeGeofence] 등록: \(identifier) (\(lat),\(lng) r=\(radius)m)")
        call.resolve(["success": true])
    }

    @objc func remove(_ call: CAPPluginCall) {
        guard let identifier = call.getString("identifier") else {
            call.reject("identifier 필수")
            return
        }

        for region in locationManager.monitoredRegions {
            if region.identifier == identifier {
                locationManager.stopMonitoring(for: region)
                print("[NativeGeofence] 제거: \(identifier)")
                break
            }
        }
        call.resolve(["success": true])
    }

    @objc func removeAll(_ call: CAPPluginCall) {
        for region in locationManager.monitoredRegions {
            if region.identifier.hasPrefix("shift_") {
                locationManager.stopMonitoring(for: region)
            }
        }
        print("[NativeGeofence] 전체 제거")
        call.resolve(["success": true])
    }

    // MARK: - CLLocationManagerDelegate

    public func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
        guard region is CLCircularRegion else { return }
        print("[NativeGeofence] 진입 감지: \(region.identifier)")
        notifyListeners("geofenceEnter", data: ["identifier": region.identifier])
    }

    public func locationManager(_ manager: CLLocationManager, monitoringDidFailFor region: CLRegion?, withError error: Error) {
        print("[NativeGeofence] 모니터링 에러: \(error.localizedDescription)")
    }
}
