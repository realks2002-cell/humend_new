package com.humend.hr;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import com.google.android.gms.location.Geofence;
import com.google.android.gms.location.GeofencingEvent;

import java.util.List;

public class GeofenceBroadcastReceiver extends BroadcastReceiver {

    private static final String TAG = "GeofenceReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        GeofencingEvent geofencingEvent = GeofencingEvent.fromIntent(intent);
        if (geofencingEvent == null) return;

        if (geofencingEvent.hasError()) {
            Log.e(TAG, "지오펜스 이벤트 에러: " + geofencingEvent.getErrorCode());
            return;
        }

        if (geofencingEvent.getGeofenceTransition() == Geofence.GEOFENCE_TRANSITION_ENTER) {
            List<Geofence> triggeringGeofences = geofencingEvent.getTriggeringGeofences();
            if (triggeringGeofences == null) return;

            for (Geofence geofence : triggeringGeofences) {
                String id = geofence.getRequestId();
                Log.i(TAG, "지오펜스 진입: " + id);

                // 앱을 깨움 (launch intent)
                Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
                if (launchIntent != null) {
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                    launchIntent.putExtra("geofence_enter", id);
                    context.startActivity(launchIntent);
                }
            }
        }
    }
}
