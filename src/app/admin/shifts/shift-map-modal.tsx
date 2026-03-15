"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  InfoWindowF,
} from "@react-google-maps/api";
import { createBrowserClient } from "@supabase/ssr";
import { Badge } from "@/components/ui/badge";
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
import { statusConfig } from "@/app/admin/tracking/worker-list";
import { cn } from "@/lib/utils";
import type { ShiftWithDetails } from "./shift-table";
import type { ArrivalStatus } from "@/types/location";

interface ShiftMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shifts: ShiftWithDetails[];
}

const MAP_STYLE = { width: "100%", height: "54vh", borderRadius: "0.5rem" };

function getDisplayStatus(shift: ShiftWithDetails, mounted: boolean): ArrivalStatus {
  if (!mounted) return shift.arrival_status;
  const status = shift.arrival_status;
  if (["arrived", "late", "noshow"].includes(status)) return status;
  const now = Date.now();
  const startTimeNorm = shift.start_time.length === 5 ? shift.start_time + ":00" : shift.start_time;
  const shiftStart = new Date(`${shift.work_date}T${startTimeNorm}+09:00`).getTime();
  if (now > shiftStart) return "late";
  if (
    shift.last_seen_at &&
    ["tracking", "moving"].includes(status) &&
    now - new Date(shift.last_seen_at).getTime() > 5 * 60 * 1000
  ) return "offline";
  return status;
}

type StatusFilter = ArrivalStatus | "all";

export function ShiftMapModal({ open, onOpenChange, shifts: initialShifts }: ShiftMapModalProps) {
  const [shifts, setShifts] = useState(initialShifts);
  const [selectedShift, setSelectedShift] = useState<ShiftWithDetails | null>(null);
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => setMounted(true), []);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "",
    language: "ko",
    region: "KR",
  });

  useEffect(() => {
    setShifts(initialShifts);
    setSelectedShift(null);
    setFilter("all");
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

    const ids = Array.from(shiftIdSet);
    const poll = async () => {
      const { data } = await supabase
        .from("daily_shifts")
        .select("id, arrival_status, risk_level, arrived_at, left_site_at, offsite_count, last_known_lat, last_known_lng, last_seen_at")
        .in("id", ids);
      if (data) {
        setShifts((prev) =>
          prev.map((s) => {
            const updated = data.find((d) => d.id === s.id);
            return updated ? { ...s, ...updated } : s;
          })
        );
      }
    };
    poll();
    const timer = setInterval(poll, 60_000);

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [open, shiftIdSet]);

  const [clientPos, setClientPos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const first = initialShifts[0];
    if (!first) {
      setClientPos(null);
      return;
    }

    if (first.clients.latitude && first.clients.longitude) {
      setClientPos({ lat: first.clients.latitude, lng: first.clients.longitude });
      return;
    }

    if (!isLoaded || !first.clients.location) {
      setClientPos(null);
      return;
    }

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

  useEffect(() => {
    if (!mapRef.current || !clientPos) return;
    const map = mapRef.current;
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
  }, [clientPos, initialShifts]);

  const shiftsWithDisplay = useMemo(
    () => shifts.map((s) => ({ ...s, displayStatus: getDisplayStatus(s, mounted) })),
    [shifts, mounted]
  );

  const counts = useMemo(() => {
    return shiftsWithDisplay.reduce(
      (acc, s) => {
        acc[s.displayStatus] = (acc[s.displayStatus] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [shiftsWithDisplay]);

  const filteredShifts = useMemo(() => {
    if (filter === "all") return shiftsWithDisplay;
    if (filter === "moving") return shiftsWithDisplay.filter((s) => s.displayStatus === "moving" || s.displayStatus === "tracking");
    return shiftsWithDisplay.filter((s) => s.displayStatus === filter);
  }, [shiftsWithDisplay, filter]);

  const summaryItems: { status: StatusFilter; label: string; count: number; color: string }[] = [
    { status: "all", label: "전체", count: shifts.length, color: "text-gray-700" },
    { status: "arrived", label: "도착", count: counts["arrived"] || 0, color: "text-green-600" },
    { status: "moving", label: "이동중", count: (counts["moving"] || 0) + (counts["tracking"] || 0), color: "text-blue-600" },
    { status: "offline", label: "오프라인", count: counts["offline"] || 0, color: "text-gray-500" },
    { status: "late_risk", label: "지각위험", count: counts["late_risk"] || 0, color: "text-orange-600" },
    { status: "late", label: "지각", count: counts["late"] || 0, color: "text-orange-700" },
    { status: "noshow", label: "노쇼", count: counts["noshow"] || 0, color: "text-red-800" },
    { status: "pending", label: "대기", count: counts["pending"] || 0, color: "text-gray-500" },
  ];

  const handleWorkerClick = (shift: ShiftWithDetails) => {
    setSelectedShift(shift);
    if (mapRef.current && shift.last_known_lat && shift.last_known_lng) {
      mapRef.current.panTo({ lat: shift.last_known_lat, lng: shift.last_known_lng });
      mapRef.current.setZoom(16);
    }
  };

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

            {shifts
              .filter((s) => s.last_known_lat && s.last_known_lng)
              .map((s) => {
                const displayStatus = getDisplayStatus(s, mounted);
                const color = statusColorMap[displayStatus];
                return (
                  <MarkerF
                    key={`worker-${s.id}`}
                    position={{ lat: s.last_known_lat!, lng: s.last_known_lng! }}
                    icon={{
                      url: createWorkerIcon(color),
                      scaledSize: new google.maps.Size(28, 28),
                      anchor: new google.maps.Point(14, 14),
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
                      {statusLabels[getDisplayStatus(selectedShift, mounted)]}
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

        {/* 근무자 목록 */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {summaryItems.map(({ status, label, count, color }) => (
              <button
                key={status}
                onClick={() => {
                  if (status === "moving") {
                    setFilter(filter === "moving" ? "all" : "moving");
                  } else {
                    setFilter(filter === status ? "all" : status);
                  }
                }}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                  filter === status
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white hover:bg-gray-50 border-gray-200"
                )}
              >
                <span className={filter === status ? "text-white" : color}>{label}</span>{" "}
                <span className={filter === status ? "text-gray-300" : "text-gray-400"}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {filteredShifts.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                해당 상태의 근무자가 없습니다.
              </div>
            ) : (
              filteredShifts.map((shift) => {
                const config = statusConfig[shift.displayStatus];
                return (
                  <button
                    key={shift.id}
                    onClick={() => handleWorkerClick(shift)}
                    className={cn(
                      "w-full text-left rounded-lg border p-2.5 transition-colors hover:ring-1 hover:ring-gray-300",
                      config.bgColor,
                      selectedShift?.id === shift.id && "ring-2 ring-gray-400"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">
                        {shift.members.name ?? "이름없음"}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn("text-xs", config.color, "border-current/30")}
                      >
                        {config.label}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>출근 {shift.start_time.slice(0, 5)}</span>
                      {shift.arrived_at && (
                        <span>
                          도착{" "}
                          {new Date(shift.arrived_at).toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                      {shift.last_seen_at && !shift.arrived_at && (
                        <span>
                          최근{" "}
                          {new Date(shift.last_seen_at).toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
