package com.humend.hr;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.location.Location;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.google.android.gms.tasks.CancellationTokenSource;
import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

public class LocationCheckFirebaseService extends MessagingService {

    private static final String TAG = "LocationCheckFCM";

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();
        String type = data.get("type");

        if ("location_check".equals(type)) {
            String shiftId = data.get("shiftId");
            String latStr = data.get("lat");
            String lngStr = data.get("lng");

            if (shiftId == null || latStr == null || lngStr == null) return;

            double targetLat = Double.parseDouble(latStr);
            double targetLng = Double.parseDouble(lngStr);

            Log.i(TAG, "location_check 수신: shift_" + shiftId);
            checkLocationAndCallAPI(shiftId, targetLat, targetLng);
            return;
        }

        // location_check가 아닌 메시지는 Capacitor에 위임 (super 호출)
        super.onMessageReceived(remoteMessage);
    }

    private void checkLocationAndCallAPI(String shiftId, double targetLat, double targetLng) {
        FusedLocationProviderClient client = LocationServices.getFusedLocationProviderClient(this);
        CancellationTokenSource cts = new CancellationTokenSource();
        CountDownLatch latch = new CountDownLatch(1);

        try {
            client.getCurrentLocation(Priority.PRIORITY_BALANCED_POWER_ACCURACY, cts.getToken())
                .addOnSuccessListener(location -> {
                    if (location == null) {
                        Log.w(TAG, "위치 획득 실패 (null)");
                        latch.countDown();
                        return;
                    }

                    double distance = haversine(location.getLatitude(), location.getLongitude(),
                                                targetLat, targetLng);
                    Log.i(TAG, "현재 거리: " + (int) distance + "m (shift: " + shiftId + ")");

                    if (distance <= 2000) {
                        callNearbyAPISync(shiftId);
                        sendLocalNotification(shiftId);
                    }
                    latch.countDown();
                })
                .addOnFailureListener(e -> {
                    Log.e(TAG, "위치 획득 에러: " + e.getMessage());
                    latch.countDown();
                });

            // 최대 15초 대기 (onMessageReceived는 20초 제한)
            latch.await(15, TimeUnit.SECONDS);
        } catch (SecurityException e) {
            Log.e(TAG, "위치 권한 없음: " + e.getMessage());
        } catch (InterruptedException e) {
            Log.e(TAG, "대기 중단: " + e.getMessage());
        }
    }

    /** 동기 HTTP 호출 (onMessageReceived 스레드에서 실행 — 이미 백그라운드 스레드) */
    private void callNearbyAPISync(String shiftId) {
        SharedPreferences prefs = getApplicationContext()
            .getSharedPreferences("NativeGeofence", Context.MODE_PRIVATE);
        String token = prefs.getString("supabase_access_token", null);
        if (token == null) {
            Log.w(TAG, "nearby API 실패: 토큰 없음");
            return;
        }

        try {
            URL url = new URL("https://humendhr.com/api/native/attendance/nearby");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Authorization", "Bearer " + token);
            conn.setDoOutput(true);
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);

            String body = "{\"shiftId\":\"" + shiftId + "\"}";
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.getBytes(StandardCharsets.UTF_8));
            }

            int responseCode = conn.getResponseCode();
            Log.i(TAG, "nearby API 응답: " + responseCode);
            conn.disconnect();
        } catch (Exception e) {
            Log.e(TAG, "nearby API 에러: " + e.getMessage());
        }
    }

    private void sendLocalNotification(String shiftId) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                "default", "기본 알림", NotificationManager.IMPORTANCE_HIGH
            );
            nm.createNotificationChannel(channel);
        }

        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pi = PendingIntent.getActivity(
            this, shiftId.hashCode(), launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, "default")
            .setSmallIcon(android.R.drawable.ic_dialog_map)
            .setContentTitle("근무지 근처입니다")
            .setContentText("출근 확인을 위해 앱을 열어주세요.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pi);

        nm.notify(("lc_" + shiftId).hashCode(), builder.build());
        Log.i(TAG, "로컬 알림 발송: location_check_" + shiftId);
    }

    private static double haversine(double lat1, double lng1, double lat2, double lng2) {
        double R = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
