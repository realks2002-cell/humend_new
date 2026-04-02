package com.humend.hr;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.Geofence;
import com.google.android.gms.location.GeofencingEvent;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
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

            // goAsync()로 BroadcastReceiver 수명 연장 (HTTP 완료까지)
            final PendingResult pendingResult = goAsync();
            String firstShiftId = null;

            for (Geofence geofence : triggeringGeofences) {
                String id = geofence.getRequestId();
                Log.i(TAG, "지오펜스 진입: " + id);

                // 1. 네이티브에서 직접 nearby API 호출 (첫 번째만)
                if (id.startsWith("shift_") && firstShiftId == null) {
                    firstShiftId = id.substring(6);
                    sendLocalNotification(context, firstShiftId);
                }

                // 2. 앱을 깨움 (launch intent)
                Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
                if (launchIntent != null) {
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                    launchIntent.putExtra("geofence_enter", id);
                    context.startActivity(launchIntent);
                }
            }

            // API 호출은 1회만 (pendingResult.finish()도 1회)
            if (firstShiftId != null) {
                callNearbyAPI(context, firstShiftId, pendingResult);
            } else {
                pendingResult.finish();
            }
        }
    }

    private void callNearbyAPI(Context context, String shiftId, PendingResult pendingResult) {
        SharedPreferences prefs = context.getApplicationContext()
            .getSharedPreferences("NativeGeofence", Context.MODE_PRIVATE);
        String token = prefs.getString("supabase_access_token", null);
        if (token == null) {
            Log.w(TAG, "nearby API 실패: 토큰 없음");
            pendingResult.finish();
            return;
        }

        new Thread(() -> {
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
            } finally {
                pendingResult.finish();
            }
        }).start();
    }

    private void sendLocalNotification(Context context, String shiftId) {
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                "default", "기본 알림", NotificationManager.IMPORTANCE_HIGH
            );
            nm.createNotificationChannel(channel);
        }

        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent pi = PendingIntent.getActivity(
            context, shiftId.hashCode(), launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, "default")
            .setSmallIcon(android.R.drawable.ic_dialog_map)
            .setContentTitle("근무지 근처입니다")
            .setContentText("출근 확인을 위해 앱을 열어주세요.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pi);

        nm.notify(shiftId.hashCode(), builder.build());
        Log.i(TAG, "로컬 알림 발송: nearby_" + shiftId);
    }
}
