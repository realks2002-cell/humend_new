"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  InfoWindowF,
} from "@react-google-maps/api";
import { createBrowserClient } from "@supabase/ssr";
import type { DailyShiftWithDetails, ArrivalStatus, MarkerColor } from "@/types/location";

const MAP_CENTER = { lat: 37.5665, lng: 126.978 }; // 서울 시청
const MAP_STYLE = { width: "100%", height: "600px", borderRadius: "0.5rem" };

export const statusColorMap: Record<ArrivalStatus, MarkerColor> = {
  pending: "gray",
  tracking: "blue",
  moving: "blue",
  late_risk: "orange",
  noshow_risk: "red",
  arrived: "green",
  late: "orange",
  noshow: "darkred",
};

export const markerColors: Record<MarkerColor, string> = {
  green: "#22c55e",
  blue: "#3b82f6",
  orange: "#f97316",
  red: "#ef4444",
  darkred: "#991b1b",
  gray: "#9ca3af",
};

export function createWorkerIcon(color: MarkerColor) {
  const hex = markerColors[color];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="${hex}" stroke="white" stroke-width="2"/>
    <circle cx="12" cy="12" r="4" fill="white"/>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function createClientIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <path d="M14 2 L4 14 L8 14 L8 26 L20 26 L20 14 L24 14 Z" fill="#6366f1" stroke="white" stroke-width="1.5"/>
    <rect x="11" y="16" width="6" height="10" fill="white" rx="1"/>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const statusLabels: Record<ArrivalStatus, string> = {
  pending: "대기",
  tracking: "추적중",
  moving: "이동중",
  late_risk: "지각위험",
  noshow_risk: "노쇼위험",
  arrived: "도착",
  late: "지각도착",
  noshow: "노쇼",
};

export function TrackingMap({ shifts: externalShifts }: { shifts: DailyShiftWithDetails[] }) {
  const [shifts, setShifts] = useState(externalShifts);
  const [selectedShift, setSelectedShift] = useState<DailyShiftWithDetails | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "",
    language: "ko",
    region: "KR",
  });

  // 외부 prop 변경 시 내부 state 동기화
  useEffect(() => {
    setShifts(externalShifts);
  }, [externalShifts]);

  // shifts 변경 시 bounds 자동 업데이트
  useEffect(() => {
    if (!mapRef.current || shifts.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    let hasPoint = false;
    shifts.forEach((s) => {
      if (s.clients.latitude && s.clients.longitude) {
        bounds.extend({ lat: s.clients.latitude, lng: s.clients.longitude });
        hasPoint = true;
      }
      if (s.last_known_lat && s.last_known_lng) {
        bounds.extend({ lat: s.last_known_lat, lng: s.last_known_lng });
        hasPoint = true;
      }
    });
    if (hasPoint) mapRef.current.fitBounds(bounds);
  }, [shifts]);

  // Supabase Realtime 구독
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel("tracking-shifts")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "daily_shifts",
        },
        (payload) => {
          setShifts((prev) =>
            prev.map((s) =>
              s.id === payload.new.id
                ? {
                    ...s,
                    arrival_status: payload.new.arrival_status,
                    risk_level: payload.new.risk_level,
                    arrived_at: payload.new.arrived_at,
                    last_known_lat: payload.new.last_known_lat,
                    last_known_lng: payload.new.last_known_lng,
                    last_seen_at: payload.new.last_seen_at,
                  }
                : s
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-muted/30" style={{ height: 600 }}>
        <p className="text-muted-foreground">지도 로딩 중...</p>
      </div>
    );
  }

  // 고객사 중복 제거
  const uniqueClients = Array.from(
    new Map(
      shifts
        .filter((s) => s.clients.latitude && s.clients.longitude)
        .map((s) => [s.client_id, s.clients])
    ).entries()
  );

  return (
    <GoogleMap
      mapContainerStyle={MAP_STYLE}
      center={MAP_CENTER}
      zoom={11}
      onLoad={onMapLoad}
      options={{
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
      }}
    >
      {/* 고객사 마커 */}
      {uniqueClients.map(([clientId, client]) => (
        <MarkerF
          key={`client-${clientId}`}
          position={{ lat: client.latitude!, lng: client.longitude! }}
          icon={{
            url: createClientIcon(),
            scaledSize: new google.maps.Size(28, 28),
            anchor: new google.maps.Point(14, 26),
          }}
          title={client.company_name}
        />
      ))}

      {/* 근무자 마커 */}
      {shifts
        .filter((s) => s.last_known_lat && s.last_known_lng)
        .map((s) => {
          const color = statusColorMap[s.arrival_status];
          return (
            <MarkerF
              key={`worker-${s.id}`}
              position={{ lat: s.last_known_lat!, lng: s.last_known_lng! }}
              icon={{
                url: createWorkerIcon(color),
                scaledSize: new google.maps.Size(24, 24),
                anchor: new google.maps.Point(12, 12),
              }}
              onClick={() => setSelectedShift(s)}
            />
          );
        })}

      {/* InfoWindow */}
      {selectedShift && selectedShift.last_known_lat && selectedShift.last_known_lng && (
        <InfoWindowF
          position={{
            lat: selectedShift.last_known_lat,
            lng: selectedShift.last_known_lng,
          }}
          onCloseClick={() => setSelectedShift(null)}
        >
          <div className="p-1 min-w-[180px]">
            <p className="font-semibold text-sm">
              {selectedShift.members.name ?? "이름없음"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {statusLabels[selectedShift.arrival_status]}
            </p>
            <p className="text-xs mt-1">
              고객사: {selectedShift.clients.company_name}
            </p>
            <p className="text-xs">
              출근: {selectedShift.start_time.slice(0, 5)}
            </p>
            {selectedShift.arrived_at && (
              <p className="text-xs">
                도착: {new Date(selectedShift.arrived_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
            {selectedShift.last_seen_at && (
              <p className="text-xs text-gray-400">
                최근: {new Date(selectedShift.last_seen_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
            <div className="flex gap-1 mt-2">
              <a
                href={`tel:${selectedShift.members.phone}`}
                className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
              >
                전화
              </a>
              <a
                href={`sms:${selectedShift.members.phone}`}
                className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100"
              >
                문자
              </a>
            </div>
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
}
