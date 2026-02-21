package com.humend.hr;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GoogleAuth.class);
        registerPlugin(PushNotificationsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
