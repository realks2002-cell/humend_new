"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { GoogleMap as GoogleMapComponent, useJsApiLoader } from "@react-google-maps/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";

interface GoogleMapProps {
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  editable?: boolean;
  onLocationChange?: (lat: number, lng: number) => void;
  height?: string;
}

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };

export function GoogleMap({
  latitude,
  longitude,
  address,
  editable = false,
  onLocationChange,
  height = "220px",
}: GoogleMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "",
    language: "ko",
    region: "KR",
  });

  const [searchQuery, setSearchQuery] = useState(address ?? "");
  const [searching, setSearching] = useState(false);
  const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral | null>(
    latitude && longitude ? { lat: latitude, lng: longitude } : null
  );
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const onLocationChangeRef = useRef(onLocationChange);
  onLocationChangeRef.current = onLocationChange;

  const center = markerPosition ?? DEFAULT_CENTER;

  const placeMarker = useCallback((pos: google.maps.LatLngLiteral) => {
    if (!mapRef.current) return;

    if (markerRef.current) {
      markerRef.current.setPosition(pos);
    } else {
      markerRef.current = new google.maps.Marker({
        position: pos,
        map: mapRef.current,
      });
    }
  }, []);

  useEffect(() => {
    if (markerPosition) placeMarker(markerPosition);
  }, [markerPosition, placeMarker]);

  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    };
  }, []);

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;

      if (latitude && longitude) {
        placeMarker({ lat: latitude, lng: longitude });
      } else if (address) {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address }, (results, status) => {
          if (status === "OK" && results && results[0]) {
            const loc = results[0].geometry.location;
            const pos = { lat: loc.lat(), lng: loc.lng() };
            setMarkerPosition(pos);
            map.panTo(pos);
          }
        });
      }

      if (editable) {
        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          setMarkerPosition({ lat, lng });
          onLocationChangeRef.current?.(lat, lng);
        });
      }
    },
    [latitude, longitude, address, editable, placeMarker]
  );

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !mapRef.current) return;
    setSearching(true);

    try {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: searchQuery }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const loc = results[0].geometry.location;
          const lat = loc.lat();
          const lng = loc.lng();
          setMarkerPosition({ lat, lng });
          mapRef.current?.panTo({ lat, lng });
          onLocationChangeRef.current?.(lat, lng);
        }
        setSearching(false);
      });
    } catch {
      setSearching(false);
    }
  }, [searchQuery]);

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground"
      >
        Google Maps API 키가 설정되지 않았습니다
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground"
      >
        지도를 불러올 수 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {editable && (
        <>
          <div className="flex gap-2">
            <Input
              placeholder="주소를 입력하세요"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleSearch}
              disabled={searching}
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">지도를 클릭하면 핀이 이동합니다</p>
        </>
      )}
      <div className="relative">
        {!isLoaded ? (
          <div
            style={{ height }}
            className="flex items-center justify-center rounded-md border bg-muted"
          >
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <GoogleMapComponent
            mapContainerStyle={{ width: "100%", height, borderRadius: "calc(var(--radius) - 2px)" }}
            center={center}
            zoom={15}
            onLoad={onMapLoad}
            onClick={undefined}
            options={{
              disableDefaultUI: true,
              zoomControl: true,
              disableDoubleClickZoom: true,
            }}
          />
        )}
      </div>
    </div>
  );
}
