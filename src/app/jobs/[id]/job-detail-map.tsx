"use client";

import { KakaoMap } from "@/components/ui/kakao-map";

interface JobDetailMapProps {
  latitude?: number;
  longitude?: number;
  address: string;
}

export function JobDetailMap({ latitude, longitude, address }: JobDetailMapProps) {
  return (
    <KakaoMap
      latitude={latitude}
      longitude={longitude}
      address={address}
      height="300px"
    />
  );
}
