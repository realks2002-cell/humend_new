package com.humend.hr;

import android.Manifest;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import androidx.core.app.ActivityCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.location.Geofence;
import com.google.android.gms.location.GeofencingClient;
import com.google.android.gms.location.GeofencingRequest;
import com.google.android.gms.location.LocationServices;

import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import android.content.Context;
import android.content.SharedPreferences;

import java.util.Collections;
import java.util.concurrent.TimeUnit;

@CapacitorPlugin(name = "NativeGeofence")
public class NativeGeofencePlugin extends Plugin {

    private static final String TAG = "NativeGeofence";
    private GeofencingClient geofencingClient;

    @Override
    public void load() {
        geofencingClient = LocationServices.getGeofencingClient(getActivity());
    }

    @PluginMethod
    public void register(PluginCall call) {
        Double lat = call.getDouble("latitude");
        Double lng = call.getDouble("longitude");
        Double radius = call.getDouble("radius");
        String identifier = call.getString("identifier");

        if (lat == null || lng == null || radius == null || identifier == null) {
            call.reject("latitude, longitude, radius, identifier 필수");
            return;
        }

        if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            call.reject("위치 권한 없음");
            return;
        }

        boolean isDepart = identifier.startsWith("depart_");
        int transitionType = isDepart ? Geofence.GEOFENCE_TRANSITION_EXIT : Geofence.GEOFENCE_TRANSITION_ENTER;
        int initialTrigger = isDepart ? GeofencingRequest.INITIAL_TRIGGER_EXIT : GeofencingRequest.INITIAL_TRIGGER_ENTER;

        Geofence geofence = new Geofence.Builder()
                .setRequestId(identifier)
                .setCircularRegion(lat, lng, radius.floatValue())
                .setExpirationDuration(Geofence.NEVER_EXPIRE)
                .setTransitionTypes(transitionType)
                .build();

        GeofencingRequest request = new GeofencingRequest.Builder()
                .setInitialTrigger(initialTrigger)
                .addGeofence(geofence)
                .build();

        geofencingClient.addGeofences(request, getGeofencePendingIntent())
                .addOnSuccessListener(aVoid -> {
                    Log.i(TAG, "지오펜스 등록: " + identifier + " (" + lat + "," + lng + " r=" + radius + "m)");
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    call.resolve(ret);
                })
                .addOnFailureListener(e -> {
                    Log.e(TAG, "지오펜스 등록 실패: " + e.getMessage());
                    call.reject("지오펜스 등록 실패: " + e.getMessage());
                });
    }

    @PluginMethod
    public void setAuthToken(PluginCall call) {
        String token = call.getString("token");
        if (token == null) {
            call.reject("token 필수");
            return;
        }
        SharedPreferences prefs = getContext().getApplicationContext().getSharedPreferences("NativeGeofence", Context.MODE_PRIVATE);
        prefs.edit().putString("supabase_access_token", token).apply();
        Log.i(TAG, "auth token 저장됨");
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void startPeriodicLocationBackup(PluginCall call) {
        try {
            Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

            PeriodicWorkRequest work = new PeriodicWorkRequest.Builder(
                LocationBackupWorker.class, 15, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .build();

            WorkManager.getInstance(getContext()).enqueueUniquePeriodicWork(
                "location_backup_worker",
                ExistingPeriodicWorkPolicy.KEEP,
                work
            );
            Log.i(TAG, "주기 위치 백업 시작됨 (15분)");
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("주기 위치 백업 시작 실패: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopPeriodicLocationBackup(PluginCall call) {
        try {
            WorkManager.getInstance(getContext()).cancelUniqueWork("location_backup_worker");
            Log.i(TAG, "주기 위치 백업 중단됨");
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("주기 위치 백업 중단 실패: " + e.getMessage());
        }
    }

    @PluginMethod
    public void isBatteryOptimizationIgnored(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            boolean ignored = pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
            ret.put("ignored", ignored);
        } else {
            ret.put("ignored", true);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void requestBatteryOptimizationExemption(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("배터리 최적화 예외 요청 실패: " + e.getMessage());
            }
        } else {
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void setApiKey(PluginCall call) {
        String apiKey = call.getString("apiKey");
        if (apiKey == null) {
            call.reject("apiKey 필수");
            return;
        }
        SharedPreferences prefs = getContext().getApplicationContext().getSharedPreferences("NativeGeofence", Context.MODE_PRIVATE);
        prefs.edit().putString("member_api_key", apiKey).apply();
        Log.i(TAG, "api key 저장됨");
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void remove(PluginCall call) {
        String identifier = call.getString("identifier");
        if (identifier == null) {
            call.reject("identifier 필수");
            return;
        }

        geofencingClient.removeGeofences(Collections.singletonList(identifier))
                .addOnSuccessListener(aVoid -> {
                    Log.i(TAG, "지오펜스 제거: " + identifier);
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    call.resolve(ret);
                })
                .addOnFailureListener(e -> call.reject("지오펜스 제거 실패: " + e.getMessage()));
    }

    @PluginMethod
    public void removeAll(PluginCall call) {
        geofencingClient.removeGeofences(getGeofencePendingIntent())
                .addOnSuccessListener(aVoid -> {
                    Log.i(TAG, "지오펜스 전체 제거");
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    call.resolve(ret);
                })
                .addOnFailureListener(e -> call.reject("지오펜스 전체 제거 실패: " + e.getMessage()));
    }

    private PendingIntent getGeofencePendingIntent() {
        Intent intent = new Intent(getContext(), GeofenceBroadcastReceiver.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;
        }
        return PendingIntent.getBroadcast(getContext(), 0, intent, flags);
    }
}
