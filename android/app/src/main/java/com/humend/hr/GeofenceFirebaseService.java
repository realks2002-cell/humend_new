package com.humend.hr;

import android.Manifest;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;

import com.google.android.gms.location.Geofence;
import com.google.android.gms.location.GeofencingClient;
import com.google.android.gms.location.GeofencingRequest;
import com.google.android.gms.location.LocationServices;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class GeofenceFirebaseService extends FirebaseMessagingService {

    private static final String TAG = "GeofenceFCM";

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Map<String, String> data = remoteMessage.getData();
        String type = data.get("type");

        if ("geofence_register".equals(type)) {
            String latStr = data.get("lat");
            String lngStr = data.get("lng");
            String shiftId = data.get("shiftId");
            String radiusStr = data.get("radius");

            if (latStr == null || lngStr == null || shiftId == null) {
                Log.w(TAG, "지오펜스 데이터 부족");
                return;
            }

            try {
                double lat = Double.parseDouble(latStr);
                double lng = Double.parseDouble(lngStr);
                float radius = radiusStr != null ? Float.parseFloat(radiusStr) : 2000f;
                registerGeofence(lat, lng, radius, "shift_" + shiftId);
            } catch (NumberFormatException e) {
                Log.e(TAG, "좌표 파싱 실패: " + e.getMessage());
            }
        }
    }

    private void registerGeofence(double lat, double lng, float radius, String identifier) {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "위치 권한 없음 — 지오펜스 등록 스킵");
            return;
        }

        GeofencingClient client = LocationServices.getGeofencingClient(this);

        Geofence geofence = new Geofence.Builder()
                .setRequestId(identifier)
                .setCircularRegion(lat, lng, radius)
                .setExpirationDuration(Geofence.NEVER_EXPIRE)
                .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER)
                .build();

        GeofencingRequest request = new GeofencingRequest.Builder()
                .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
                .addGeofence(geofence)
                .build();

        Intent intent = new Intent(this, GeofenceBroadcastReceiver.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;
        }
        PendingIntent pendingIntent = PendingIntent.getBroadcast(this, 0, intent, flags);

        client.addGeofences(request, pendingIntent)
                .addOnSuccessListener(aVoid -> Log.i(TAG, "지오펜스 등록 성공: " + identifier + " (" + lat + "," + lng + " r=" + radius + "m)"))
                .addOnFailureListener(e -> Log.e(TAG, "지오펜스 등록 실패: " + e.getMessage()));
    }
}
