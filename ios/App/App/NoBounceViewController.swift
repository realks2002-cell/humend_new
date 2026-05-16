import UIKit
import Capacitor

class NoBounceViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        // 로컬 네이티브 플러그인 명시적 등록 (Capacitor 8은 in-project 플러그인 자동 발견 안 함)
        bridge?.registerPluginInstance(NativeGeofencePlugin())
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        webView?.scrollView.bounces = false
        webView?.scrollView.alwaysBounceHorizontal = false
        webView?.scrollView.alwaysBounceVertical = false
    }
}
