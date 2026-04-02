package com.humend.hr;

import android.Manifest;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
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

import android.content.Context;
import android.content.SharedPreferences;

import java.util.Collections;

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

        Geofence geofence = new Geofence.Builder()
                .setRequestId(identifier)
                .setCircularRegion(lat, lng, radius.floatValue())
                .setExpirationDuration(Geofence.NEVER_EXPIRE)
                .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER)
                .build();

        GeofencingRequest request = new GeofencingRequest.Builder()
                .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
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
