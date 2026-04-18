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
    private static final String FG_CHANNEL_ID = "location_check_fg";
    private static final int FG_NOTIFICATION_ID = 9001;

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();
        String type = data.get("type");

        if ("location_check".equals(type)) {
            String shiftId = data.get("shiftId");
            String latStr = data.get("lat");
            String lngStr = data.get("lng");

            if (shiftId == null || latStr == null || lngStr == null) return;

            double targetLat, targetLng;
            try {
                targetLat = Double.parseDouble(latStr);
                targetLng = Double.parseDouble(lngStr);
            } catch (NumberFormatException e) {
                Log.e(TAG, "lat/lng 파싱 실패: " + e.getMessage());
                return;
            }

            Log.i(TAG, "location_check 수신: shift_" + shiftId);

            // Foreground Service 전환 — 백그라운드 제한 우회
            boolean fgStarted = startAsForegroundService();
            try {
                checkLocationAndCallAPI(shiftId, targetLat, targetLng);
            } finally {
                if (fgStarted) stopForegroundService();
            }
            return;
        }

        // location_check가 아닌 메시지는 Capacitor에 위임 (super 호출)
        super.onMessageReceived(remoteMessage);
    }

    private boolean startAsForegroundService() {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm != null) {
                NotificationChannel channel = new NotificationChannel(
                    FG_CHANNEL_ID, "출근 확인",
                    NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("근무지 접근 확인 중");
                nm.createNotificationChannel(channel);
            }

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, FG_CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_map)
                .setContentTitle("휴멘드 출근확인")
                .setContentText("근무지 접근 확인 중...")
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(FG_NOTIFICATION_ID, builder.build(),
                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            } else {
                startForeground(FG_NOTIFICATION_ID, builder.build());
            }
            Log.i(TAG, "Foreground Service 시작");
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Foreground Service 시작 실패 (백그라운드 모드로 계속): " + e.getMessage());
            return false;
        }
    }

    private void stopForegroundService() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE);
            } else {
                stopForeground(true);
            }
            Log.i(TAG, "Foreground Service 종료");
        } catch (Exception e) {
            Log.e(TAG, "Foreground Service 종료 실패: " + e.getMessage());
        }
    }

    private void checkLocationAndCallAPI(String shiftId, double targetLat, double targetLng) {
        FusedLocationProviderClient client = LocationServices.getFusedLocationProviderClient(this);

        // 1순위: getLastLocation (즉시, 5~10분 이내 캐시)
        try {
            CountDownLatch latch = new CountDownLatch(1);
            client.getLastLocation()
                .addOnSuccessListener(location -> {
                    if (location != null && location.getAccuracy() <= 400) {
                        long age = System.currentTimeMillis() - location.getTime();
                        Log.i(TAG, "lastLocation: acc=" + (int) location.getAccuracy() + "m, age=" + (age / 1000) + "s");
                        if (age < 180000) { // 3분 이내 캐시면 사용
                            processLocation(shiftId, location, targetLat, targetLng);
                            latch.countDown();
                            return;
                        }
                    }
                    latch.countDown();
                })
                .addOnFailureListener(e -> latch.countDown());
            latch.await(3, TimeUnit.SECONDS);
        } catch (Exception e) {
            Log.w(TAG, "lastLocation 실패: " + e.getMessage());
        }

        // 2순위: BALANCED (WiFi+셀룰러, 빠름)
        if (!tryGetLocation(client, Priority.PRIORITY_BALANCED_POWER_ACCURACY, 5,
                           shiftId, targetLat, targetLng)) {
            // 3순위: HIGH_ACCURACY (GPS, 정확함)
            tryGetLocation(client, Priority.PRIORITY_HIGH_ACCURACY, 10,
                          shiftId, targetLat, targetLng);
        }
    }

    private boolean tryGetLocation(FusedLocationProviderClient client, int priority, int timeoutSec,
                                    String shiftId, double targetLat, double targetLng) {
        CancellationTokenSource cts = new CancellationTokenSource();
        CountDownLatch latch = new CountDownLatch(1);
        final boolean[] success = {false};

        try {
            client.getCurrentLocation(priority, cts.getToken())
                .addOnSuccessListener(location -> {
                    if (location != null && location.getAccuracy() <= 500) {
                        Log.i(TAG, "priority=" + priority + " acc=" + (int) location.getAccuracy() + "m");
                        processLocation(shiftId, location, targetLat, targetLng);
                        success[0] = true;
                    } else {
                        Log.w(TAG, "priority=" + priority + " 위치 품질 부족");
                    }
                    latch.countDown();
                })
                .addOnFailureListener(e -> {
                    Log.e(TAG, "priority=" + priority + " 에러: " + e.getMessage());
                    latch.countDown();
                });
            latch.await(timeoutSec, TimeUnit.SECONDS);
        } catch (SecurityException e) {
            Log.e(TAG, "위치 권한 없음: " + e.getMessage());
        } catch (InterruptedException e) {
            Log.e(TAG, "대기 중단: " + e.getMessage());
        }
        return success[0];
    }

    private void processLocation(String shiftId, Location location, double targetLat, double targetLng) {
        double distance = haversine(location.getLatitude(), location.getLongitude(),
                                    targetLat, targetLng);
        Log.i(TAG, "현재 거리: " + (int) distance + "m (shift: " + shiftId + ")");

        if (distance <= 300) {
            callNearbyAPISync(shiftId);
            callArriveAPISync(shiftId, location.getLatitude(), location.getLongitude());
        } else if (distance <= 2000) {
            callNearbyAPISync(shiftId);
        } else if (distance <= 5000) {
            callApproachingAPISync(shiftId);
        }
    }

    private void callApproachingAPISync(String shiftId) {
        SharedPreferences prefs = getApplicationContext()
            .getSharedPreferences("NativeGeofence", Context.MODE_PRIVATE);
        String apiKey = prefs.getString("member_api_key", null);
        String token = prefs.getString("supabase_access_token", null);
        if (apiKey == null && token == null) return;

        try {
            URL url = new URL("https://humendhr.com/api/native/attendance/approaching");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            setAuthHeader(conn, prefs);
            conn.setDoOutput(true);
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(("{\"shiftId\":\"" + shiftId + "\"}").getBytes(StandardCharsets.UTF_8));
            }
            Log.i(TAG, "approaching API 응답: " + conn.getResponseCode());
            conn.disconnect();
        } catch (Exception e) {
            Log.e(TAG, "approaching API 에러: " + e.getMessage());
        }
    }

    private void setAuthHeader(HttpURLConnection conn, SharedPreferences prefs) {
        String apiKey = prefs.getString("member_api_key", null);
        if (apiKey != null) {
            conn.setRequestProperty("X-API-Key", apiKey);
            return;
        }
        String token = prefs.getString("supabase_access_token", null);
        if (token != null) {
            conn.setRequestProperty("Authorization", "Bearer " + token);
        }
    }

    private void callArriveAPISync(String shiftId, double lat, double lng) {
        SharedPreferences prefs = getApplicationContext()
            .getSharedPreferences("NativeGeofence", Context.MODE_PRIVATE);
        String apiKey = prefs.getString("member_api_key", null);
        String token = prefs.getString("supabase_access_token", null);
        if (apiKey == null && token == null) return;

        try {
            URL url = new URL("https://humendhr.com/api/native/attendance/arrive");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            setAuthHeader(conn, prefs);
            conn.setDoOutput(true);
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);

            String body = "{\"shiftId\":\"" + shiftId + "\",\"lat\":" + lat + ",\"lng\":" + lng + "}";
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.getBytes(StandardCharsets.UTF_8));
            }

            int responseCode = conn.getResponseCode();
            Log.i(TAG, "arrive API 응답: " + responseCode);
            conn.disconnect();
        } catch (Exception e) {
            Log.e(TAG, "arrive API 에러: " + e.getMessage());
        }
    }

    /** 동기 HTTP 호출 (onMessageReceived 스레드에서 실행 — 이미 백그라운드 스레드) */
    private void callNearbyAPISync(String shiftId) {
        SharedPreferences prefs = getApplicationContext()
            .getSharedPreferences("NativeGeofence", Context.MODE_PRIVATE);
        String apiKey = prefs.getString("member_api_key", null);
        String token = prefs.getString("supabase_access_token", null);
        if (apiKey == null && token == null) {
            Log.w(TAG, "nearby API 실패: 인증 없음");
            return;
        }

        try {
            URL url = new URL("https://humendhr.com/api/native/attendance/nearby");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            setAuthHeader(conn, prefs);
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

    private void sendLocalNotification(String shiftId, String title, String body) {
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
            .setContentTitle(title)
            .setContentText(body)
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
