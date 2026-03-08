"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  InfoWindowF,
} from "@react-google-maps/api";
import { createBrowserClient } from "@supabase/ssr";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createWorkerIcon,
  createClientIcon,
  statusColorMap,
  statusLabels,
} from "@/app/admin/tracking/tracking-map";
import type { ShiftWithDetails } from "./shift-table";
import type { ArrivalStatus } from "@/types/location";

interface ShiftMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shifts: ShiftWithDetails[];
}

const MAP_STYLE = { width: "100%", height: "60vh", borderRadius: "0.5rem" };

export function ShiftMapModal({ open, onOpenChange, shifts: initialShifts }: ShiftMapModalProps) {
  const [shifts, setShifts] = useState(initialShifts);
  const [selectedShift, setSelectedShift] = useState<ShiftWithDetails | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "",
    language: "ko",
    region: "KR",
  });

  useEffect(() => {
    setShifts(initialShifts);
    setSelectedShift(null);
  }, [initialShifts]);

  const shiftIdSet = useMemo(
    () => new Set(initialShifts.map((s) => s.id)),
    [initialShifts]
  );

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
        {
          event: "UPDATE",
          schema: "public",
          table: "daily_shifts",
        },
        (payload) => {
          if (!shiftIdSet.has(payload.new.id)) return;
          setShifts((prev) =>
            prev.map((s) =>
              s.id === payload.new.id
                ? {
                    ...s,
                    arrival_status: payload.new.arrival_status as ArrivalStatus,
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
  }, [open, shiftIdSet]);

  const clientPos = useMemo(() => {
    const first = initialShifts[0];
    if (!first?.clients.latitude || !first?.clients.longitude) return null;
    return { lat: first.clients.latitude, lng: first.clients.longitude };
  }, [initialShifts]);

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      if (!clientPos) return;

      const bounds = new google.maps.LatLngBounds();
      bounds.extend(clientPos);
      initialShifts.forEach((s) => {
        if (s.last_known_lat && s.last_known_lng) {
          bounds.extend({ lat: s.last_known_lat, lng: s.last_known_lng });
        }
      });

      const hasWorkerLocations = initialShifts.some(
        (s) => s.last_known_lat && s.last_known_lng
      );
      if (hasWorkerLocations) {
        map.fitBounds(bounds);
      } else {
        map.setCenter(clientPos);
        map.setZoom(15);
      }
    },
    [clientPos, initialShifts]
  );

  if (initialShifts.length === 0) return null;

  const first = initialShifts[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {first.clients.company_name} - {first.start_time.slice(0, 5)}~{first.end_time.slice(0, 5)} ({shifts.length}명)
          </DialogTitle>
        </DialogHeader>

        {!isLoaded ? (
          <div
            className="flex items-center justify-center rounded-lg border bg-muted/30"
            style={{ height: "60vh" }}
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

            {selectedShift &&
              selectedShift.last_known_lat &&
              selectedShift.last_known_lng && (
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
                    {selectedShift.arrived_at && (
                      <p className="text-xs mt-1">
                        도착:{" "}
                        {new Date(selectedShift.arrived_at).toLocaleTimeString(
                          "ko-KR",
                          { hour: "2-digit", minute: "2-digit" }
                        )}
                      </p>
                    )}
                    {selectedShift.last_seen_at && (
                      <p className="text-xs text-gray-400">
                        최근:{" "}
                        {new Date(
                          selectedShift.last_seen_at
                        ).toLocaleTimeString("ko-KR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
