"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void;
        Map: new (container: HTMLElement, options: { center: unknown; level: number }) => KakaoMap;
        LatLng: new (lat: number, lng: number) => unknown;
        Marker: new (options: { position: unknown; map?: KakaoMap }) => KakaoMarker;
        InfoWindow: new (options: { content: string }) => KakaoInfoWindow;
        services: {
          Geocoder: new () => KakaoGeocoder;
          Status: { OK: string };
        };
      };
    };
  }
}

interface KakaoMap {
  setCenter: (latlng: unknown) => void;
  setLevel: (level: number) => void;
}

interface KakaoMarker {
  setPosition: (latlng: unknown) => void;
  setMap: (map: KakaoMap | null) => void;
}

interface KakaoInfoWindow {
  open: (map: KakaoMap, marker: KakaoMarker) => void;
  close: () => void;
}

interface KakaoGeocoder {
  addressSearch: (
    address: string,
    callback: (result: { x: string; y: string }[], status: string) => void
  ) => void;
}

interface KakaoMapProps {
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  editable?: boolean;
  onLocationChange?: (lat: number, lng: number) => void;
  height?: string;
}

const KAKAO_SDK_URL = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&libraries=services&autoload=false`;

let sdkLoaded = false;

function loadKakaoSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (sdkLoaded && window.kakao?.maps) {
      window.kakao.maps.load(() => resolve());
      return;
    }

    if (document.querySelector(`script[src*="dapi.kakao.com"]`)) {
      const check = setInterval(() => {
        if (window.kakao?.maps) {
          clearInterval(check);
          sdkLoaded = true;
          window.kakao.maps.load(() => resolve());
        }
      }, 100);
      return;
    }

    const script = document.createElement("script");
    script.src = KAKAO_SDK_URL;
    script.async = true;
    script.onload = () => {
      sdkLoaded = true;
      window.kakao.maps.load(() => resolve());
    };
    script.onerror = () => reject(new Error("카카오맵 SDK 로드 실패"));
    document.head.appendChild(script);
  });
}

export function KakaoMap({
  latitude,
  longitude,
  address,
  editable = false,
  onLocationChange,
  height = "200px",
}: KakaoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<KakaoMap | null>(null);
  const markerInstance = useRef<KakaoMarker | null>(null);
  const [searchQuery, setSearchQuery] = useState(address ?? "");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const initMap = useCallback(async () => {
    if (!mapRef.current) return;

    try {
      await loadKakaoSDK();

      const { kakao } = window;
      const lat = latitude ?? 37.5665;
      const lng = longitude ?? 126.978;

      const center = new kakao.maps.LatLng(lat, lng);
      const map = new kakao.maps.Map(mapRef.current, {
        center,
        level: 3,
      });

      mapInstance.current = map;

      if (latitude && longitude) {
        const marker = new kakao.maps.Marker({ position: center, map });
        markerInstance.current = marker;

        if (address) {
          const infoWindow = new kakao.maps.InfoWindow({
            content: `<div style="padding:4px 8px;font-size:12px;white-space:nowrap;">${address}</div>`,
          });
          infoWindow.open(map, marker);
        }
      } else if (address) {
        const geocoder = new kakao.maps.services.Geocoder();
        geocoder.addressSearch(address, (result, status) => {
          if (status === kakao.maps.services.Status.OK && result.length > 0) {
            const { x, y } = result[0];
            const pos = new kakao.maps.LatLng(parseFloat(y), parseFloat(x));
            map.setCenter(pos);
            const marker = new kakao.maps.Marker({ position: pos, map });
            markerInstance.current = marker;
            const infoWindow = new kakao.maps.InfoWindow({
              content: `<div style="padding:4px 8px;font-size:12px;white-space:nowrap;">${address}</div>`,
            });
            infoWindow.open(map, marker);
          }
        });
      }
    } catch (err) {
      console.error("KakaoMap init error:", err);
    }

    setLoading(false);
  }, [latitude, longitude, address]);

  useEffect(() => {
    initMap();
  }, [initMap]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !mapInstance.current) return;
    setSearching(true);

    try {
      const { kakao } = window;
      const geocoder = new kakao.maps.services.Geocoder();

      geocoder.addressSearch(searchQuery, (result, status) => {
        if (status === kakao.maps.services.Status.OK && result.length > 0) {
          const { x, y } = result[0];
          const lat = parseFloat(y);
          const lng = parseFloat(x);
          const position = new kakao.maps.LatLng(lat, lng);

          mapInstance.current!.setCenter(position);

          if (markerInstance.current) {
            markerInstance.current.setPosition(position);
          } else {
            markerInstance.current = new kakao.maps.Marker({
              position,
              map: mapInstance.current!,
            });
          }

          onLocationChange?.(lat, lng);
        }
        setSearching(false);
      });
    } catch {
      setSearching(false);
    }
  };

  if (!process.env.NEXT_PUBLIC_KAKAO_MAP_KEY) {
    return (
      <div style={{ height }} className="flex items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
        카카오맵 API 키가 설정되지 않았습니다
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {editable && (
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
      )}
      <div className="relative">
        <div
          ref={mapRef}
          style={{ height }}
          className="w-full rounded-md border"
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-md bg-muted">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
