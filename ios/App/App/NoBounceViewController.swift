import UIKit
import Capacitor

class NoBounceViewController: CAPBridgeViewController {
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        webView?.scrollView.bounces = false
        webView?.scrollView.alwaysBounceHorizontal = false
        webView?.scrollView.alwaysBounceVertical = false
    }
}
