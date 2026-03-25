"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
} from "@react-google-maps/api";
import { createBrowserClient } from "@supabase/ssr";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ShiftWithDetails } from "./shift-table";
import type { AttendanceStatus } from "@/types/location";

interface ShiftMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shifts: ShiftWithDetails[];
}

const MAP_STYLE = { width: "100%", height: "54vh", borderRadius: "0.5rem" };

const statusLabel: Record<AttendanceStatus, string> = {
  pending: "대기",
  notified: "알림발송",
  confirmed: "출근예정",
  arrived: "출근완료",
  noshow: "노쇼",
};

const statusColor: Record<AttendanceStatus, string> = {
  pending: "text-gray-500",
  notified: "text-yellow-600",
  confirmed: "text-blue-600",
  arrived: "text-green-600",
  noshow: "text-red-700",
};

function createClientIcon() {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="red" stroke="white" stroke-width="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`
  )}`;
}

export function ShiftMapModal({ open, onOpenChange, shifts: initialShifts }: ShiftMapModalProps) {
  const [shifts, setShifts] = useState(initialShifts);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "",
    language: "ko",
    region: "KR",
  });

  useEffect(() => {
    setShifts(initialShifts);
  }, [initialShifts]);

  const shiftIdSet = useMemo(
    () => new Set(initialShifts.map((s) => s.id)),
    [initialShifts]
  );

  // Realtime 구독
  useEffect(() => {
    if (!open || shiftIdSet.size === 0) return;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel("shift-map-modal")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "daily_shifts" },
        (payload) => {
          if (!shiftIdSet.has(payload.new.id)) return;
          setShifts((prev) =>
            prev.map((s) =>
              s.id === payload.new.id
                ? {
                    ...s,
                    arrival_status: payload.new.arrival_status as AttendanceStatus,
                    arrived_at: payload.new.arrived_at,
                    confirmed_at: payload.new.confirmed_at,
                    nearby_at: payload.new.nearby_at,
                    notification_sent_count: payload.new.notification_sent_count,
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
  }, [open, shiftIdSet]);

  // 고객사 위치
  const [clientPos, setClientPos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const first = initialShifts[0];
    if (!first) { setClientPos(null); return; }

    if (first.clients.latitude && first.clients.longitude) {
      setClientPos({ lat: first.clients.latitude, lng: first.clients.longitude });
      return;
    }

    if (!isLoaded || !first.clients.location) { setClientPos(null); return; }

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: first.clients.location }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const loc = results[0].geometry.location;
        setClientPos({ lat: loc.lat(), lng: loc.lng() });
      }
    });
  }, [initialShifts, isLoaded]);

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      if (clientPos) {
        map.setCenter(clientPos);
        map.setZoom(15);
      }
    },
    [clientPos]
  );

  if (initialShifts.length === 0) return null;

  const first = initialShifts[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {first.clients.company_name} - {first.start_time.slice(0, 5)}~{first.end_time.slice(0, 5)} ({shifts.length}명)
          </DialogTitle>
        </DialogHeader>

        {!isLoaded ? (
          <div
            className="flex items-center justify-center rounded-lg border bg-muted/30"
            style={{ height: "54vh" }}
          >
            <p className="text-muted-foreground">지도 로딩 중...</p>
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={MAP_STYLE}
            center={clientPos ?? { lat: 37.5665, lng: 126.978 }}
            zoom={15}
            onLoad={onMapLoad}
            options={{
              disableDefaultUI: false,
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
            }}
          >
            {clientPos && (
              <MarkerF
                position={clientPos}
                icon={{
                  url: createClientIcon(),
                  scaledSize: new google.maps.Size(28, 28),
                  anchor: new google.maps.Point(14, 26),
                }}
                title={first.clients.company_name}
              />
            )}
          </GoogleMap>
        )}

        {/* 근무자 목록 */}
        <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
          {shifts.map((shift) => (
            <div
              key={shift.id}
              className="flex items-center justify-between rounded-lg border p-2.5"
            >
              <div>
                <p className="font-medium text-sm">
                  {shift.members.name ?? "이름없음"}
                  <span className="text-muted-foreground text-xs ml-2">
                    {shift.members.phone}
                  </span>
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>출근 {shift.start_time.slice(0, 5)}</span>
                  {shift.nearby_at && shift.arrival_status !== "arrived" && (
                    <span className="text-blue-600">
                      접근 {new Date(shift.nearby_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                  {shift.arrived_at && (
                    <span className="text-green-600">
                      도착 {new Date(shift.arrived_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn("text-xs", statusColor[shift.arrival_status], "border-current/30")}
              >
                {statusLabel[shift.arrival_status]}
              </Badge>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
