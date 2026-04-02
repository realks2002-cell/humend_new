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

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.GeofencingClient;
import com.google.android.gms.location.GeofencingRequest;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.google.android.gms.tasks.CancellationTokenSource;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
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

        int transition = geofencingEvent.getGeofenceTransition();
        List<Geofence> triggeringGeofences = geofencingEvent.getTriggeringGeofences();
        if (triggeringGeofences == null) return;

        final PendingResult pendingResult = goAsync();
        String apiShiftId = null;
        String apiType = null; // "nearby", "arrive", "depart"

        for (Geofence geofence : triggeringGeofences) {
            String id = geofence.getRequestId();
            Log.i(TAG, "지오펜스 이벤트: " + id + " transition=" + transition);

            if (transition == Geofence.GEOFENCE_TRANSITION_ENTER) {
                if (id.startsWith("shift_") && apiShiftId == null) {
                    apiShiftId = id.substring(6);
                    apiType = "nearby";
                    sendLocalNotification(context, apiShiftId, "근무지 근처입니다", "출근 확인을 위해 앱을 열어주세요.");
                } else if (id.startsWith("arrive_") && apiShiftId == null) {
                    apiShiftId = id.substring(7);
                    apiType = "arrive";
                    sendLocalNotification(context, apiShiftId, "출근 처리되었습니다", "근무를 시작합니다.");
                }
            } else if (transition == Geofence.GEOFENCE_TRANSITION_EXIT) {
                if (id.startsWith("depart_") && apiShiftId == null) {
                    apiShiftId = id.substring(7);
                    apiType = "depart";
                    sendLocalNotification(context, apiShiftId, "근무지를 이탈했습니다", "근무지로 복귀해주세요.");
                }
            }

            // 앱 깨우기
            if (transition == Geofence.GEOFENCE_TRANSITION_ENTER) {
                Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
                if (launchIntent != null) {
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                    launchIntent.putExtra("geofence_enter", id);
                    context.startActivity(launchIntent);
                }
            }
        }

        if (apiShiftId != null && apiType != null) {
            if ("arrive".equals(apiType)) {
                // arrive: GPS 1회 획득 → arrive API (lat/lng 포함) + depart 지오펜스 등록
                callArriveWithLocation(context, apiShiftId, pendingResult);
            } else {
                callAttendanceAPI(context, apiShiftId, apiType, pendingResult);
            }
        } else {
            pendingResult.finish();
        }
    }

    private void callArriveWithLocation(Context context, String shiftId, PendingResult pendingResult) {
        try {
            FusedLocationProviderClient locClient = LocationServices.getFusedLocationProviderClient(context);
            CancellationTokenSource cts = new CancellationTokenSource();

            locClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cts.getToken())
                .addOnSuccessListener(location -> {
                    new Thread(() -> {
                        try {
                            if (location != null) {
                                // arrive API with lat/lng
                                callAPISync(context, "/api/native/attendance/arrive",
                                    "{\"shiftId\":\"" + shiftId + "\",\"lat\":" + location.getLatitude() + ",\"lng\":" + location.getLongitude() + "}");

                                // depart 지오펜스 등록 (500m EXIT)
                                registerDepartGeofence(context, shiftId, location.getLatitude(), location.getLongitude());
                            } else {
                                // GPS 실패 — shiftId만으로 호출
                                callAPISync(context, "/api/native/attendance/arrive",
                                    "{\"shiftId\":\"" + shiftId + "\"}");
                            }
                        } finally {
                            pendingResult.finish();
                        }
                    }).start();
                })
                .addOnFailureListener(e -> {
                    Log.e(TAG, "arrive GPS 에러: " + e.getMessage());
                    pendingResult.finish();
                });
        } catch (SecurityException e) {
            Log.e(TAG, "arrive 위치 권한 없음: " + e.getMessage());
            pendingResult.finish();
        }
    }

    private void registerDepartGeofence(Context context, String shiftId, double lat, double lng) {
        try {
            GeofencingClient geoClient = LocationServices.getGeofencingClient(context);
            Geofence depart = new Geofence.Builder()
                .setRequestId("depart_" + shiftId)
                .setCircularRegion(lat, lng, 500f)
                .setExpirationDuration(Geofence.NEVER_EXPIRE)
                .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_EXIT)
                .build();
            GeofencingRequest req = new GeofencingRequest.Builder()
                .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_EXIT)
                .addGeofence(depart)
                .build();
            Intent intent = new Intent(context, GeofenceBroadcastReceiver.class);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) flags |= PendingIntent.FLAG_MUTABLE;
            PendingIntent pi = PendingIntent.getBroadcast(context, 0, intent, flags);
            geoClient.addGeofences(req, pi);
            Log.i(TAG, "depart 지오펜스 등록: " + shiftId);
        } catch (SecurityException e) {
            Log.e(TAG, "depart 지오펜스 권한 없음: " + e.getMessage());
        }
    }

    private void callAPISync(Context context, String path, String body) {
        SharedPreferences prefs = context.getApplicationContext()
            .getSharedPreferences("NativeGeofence", Context.MODE_PRIVATE);
        String token = prefs.getString("supabase_access_token", null);
        if (token == null) { Log.w(TAG, "API 실패: 토큰 없음"); return; }

        try {
            URL url = new URL("https://humendhr.com" + path);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Authorization", "Bearer " + token);
            conn.setDoOutput(true);
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.getBytes(StandardCharsets.UTF_8));
            }
            int code = conn.getResponseCode();
            Log.i(TAG, path + " 응답: " + code);
            conn.disconnect();
        } catch (Exception e) {
            Log.e(TAG, path + " 에러: " + e.getMessage());
        }
    }

    private void callAttendanceAPI(Context context, String shiftId, String type, PendingResult pendingResult) {
        SharedPreferences prefs = context.getApplicationContext()
            .getSharedPreferences("NativeGeofence", Context.MODE_PRIVATE);
        String token = prefs.getString("supabase_access_token", null);
        if (token == null) {
            Log.w(TAG, type + " API 실패: 토큰 없음");
            pendingResult.finish();
            return;
        }

        String path;
        switch (type) {
            case "arrive": path = "/api/native/attendance/arrive"; break;
            case "depart": path = "/api/native/attendance/depart"; break;
            default: path = "/api/native/attendance/nearby"; break;
        }

        new Thread(() -> {
            try {
                URL url = new URL("https://humendhr.com" + path);
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
                Log.i(TAG, type + " API 응답: " + responseCode);
                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, type + " API 에러: " + e.getMessage());
            } finally {
                pendingResult.finish();
            }
        }).start();
    }

    private void sendLocalNotification(Context context, String shiftId, String title, String body) {
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
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pi);

        nm.notify(shiftId.hashCode(), builder.build());
        Log.i(TAG, "로컬 알림 발송: nearby_" + shiftId);
    }
}
