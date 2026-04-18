package com.humend.hr;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.location.Location;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.google.android.gms.tasks.CancellationTokenSource;
import com.google.android.gms.tasks.Tasks;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;

/**
 * WorkManager 주기적 위치 백업 체크 (15분 간격)
 * 앱 종료 상태에서도 OS가 강제 실행
 * Silent Push 실패 시 대안으로 동작
 */
public class LocationBackupWorker extends Worker {

    private static final String TAG = "LocationBackupWorker";

    public LocationBackupWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();

        // 권한 체크
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "위치 권한 없음 → 종료");
            return Result.success();
        }

        // 인증 체크
        SharedPreferences prefs = context.getSharedPreferences("NativeGeofence", Context.MODE_PRIVATE);
        String apiKey = prefs.getString("member_api_key", null);
        String token = prefs.getString("supabase_access_token", null);
        if (apiKey == null && token == null) {
            Log.w(TAG, "인증 없음 → 종료");
            return Result.success();
        }

        // 오늘 배정 조회
        String shiftInfo = fetchTodayShift(prefs);
        if (shiftInfo == null) {
            Log.i(TAG, "오늘 배정 없음 → 종료");
            return Result.success();
        }

        String[] parts = shiftInfo.split("\\|");
        if (parts.length < 3) return Result.success();

        String shiftId = parts[0];
        double targetLat, targetLng;
        try {
            targetLat = Double.parseDouble(parts[1]);
            targetLng = Double.parseDouble(parts[2]);
        } catch (NumberFormatException e) {
            return Result.success();
        }

        // 현재 위치 획득 + API 호출
        try {
            FusedLocationProviderClient client = LocationServices.getFusedLocationProviderClient(context);
            CancellationTokenSource cts = new CancellationTokenSource();
            Location location = Tasks.await(
                client.getCurrentLocation(Priority.PRIORITY_BALANCED_POWER_ACCURACY, cts.getToken()),
                10, TimeUnit.SECONDS
            );
            if (location == null || location.getAccuracy() > 500) {
                Log.w(TAG, "위치 품질 부족");
                return Result.success();
            }

            double distance = haversine(location.getLatitude(), location.getLongitude(), targetLat, targetLng);
            Log.i(TAG, "현재 거리: " + (int) distance + "m");

            if (distance <= 300) {
                callAPI(prefs, "/api/native/attendance/nearby", "{\"shiftId\":\"" + shiftId + "\"}");
                callAPI(prefs, "/api/native/attendance/arrive",
                    "{\"shiftId\":\"" + shiftId + "\",\"lat\":" + location.getLatitude() + ",\"lng\":" + location.getLongitude() + "}");
            } else if (distance <= 2000) {
                callAPI(prefs, "/api/native/attendance/nearby", "{\"shiftId\":\"" + shiftId + "\"}");
            } else if (distance <= 5000) {
                callAPI(prefs, "/api/native/attendance/approaching", "{\"shiftId\":\"" + shiftId + "\"}");
            }

            return Result.success();
        } catch (SecurityException e) {
            Log.e(TAG, "위치 권한 에러: " + e.getMessage());
            return Result.success();
        } catch (Exception e) {
            Log.e(TAG, "작업 실패: " + e.getMessage());
            return Result.retry();
        }
    }

    /** 오늘 shift 정보 조회: shiftId|lat|lng 형식 반환 */
    private String fetchTodayShift(SharedPreferences prefs) {
        try {
            URL url = new URL("https://humendhr.com/api/native/attendance/today");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            setAuthHeader(conn, prefs);
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);

            int code = conn.getResponseCode();
            if (code != 200) {
                Log.w(TAG, "today API 응답: " + code);
                conn.disconnect();
                return null;
            }

            StringBuilder sb = new StringBuilder();
            try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = br.readLine()) != null) sb.append(line);
            }
            conn.disconnect();

            JSONObject root = new JSONObject(sb.toString());
            JSONObject shift = root.optJSONObject("shift");
            if (shift == null) return null;

            String status = shift.optString("arrival_status", "");
            if ("arrived".equals(status) || "noshow".equals(status)) return null;

            String shiftId = shift.optString("id", null);
            JSONObject clients = shift.optJSONObject("clients");
            if (shiftId == null || clients == null) return null;

            double lat = clients.optDouble("latitude", Double.NaN);
            double lng = clients.optDouble("longitude", Double.NaN);
            if (Double.isNaN(lat) || Double.isNaN(lng)) return null;

            return shiftId + "|" + lat + "|" + lng;
        } catch (Exception e) {
            Log.e(TAG, "today fetch 실패: " + e.getMessage());
            return null;
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

    private void callAPI(SharedPreferences prefs, String path, String body) {
        try {
            URL url = new URL("https://humendhr.com" + path);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            setAuthHeader(conn, prefs);
            conn.setDoOutput(true);
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.getBytes(StandardCharsets.UTF_8));
            }
            Log.i(TAG, path + " 응답: " + conn.getResponseCode());
            conn.disconnect();
        } catch (Exception e) {
            Log.e(TAG, path + " 에러: " + e.getMessage());
        }
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
