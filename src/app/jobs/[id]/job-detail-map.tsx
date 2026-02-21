"use client";

import { Component, type ReactNode } from "react";
import { GoogleMap } from "@/components/ui/google-map";

interface JobDetailMapProps {
  latitude?: number;
  longitude?: number;
  address?: string;
}

class MapErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export function JobDetailMap({ latitude, longitude, address }: JobDetailMapProps) {
  return (
    <MapErrorBoundary
      fallback={
        <div
          style={{ height: "300px" }}
          className="flex items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground"
        >
          지도를 불러올 수 없습니다
        </div>
      }
    >
      <GoogleMap
        latitude={latitude}
        longitude={longitude}
        address={address}
        height="300px"
      />
    </MapErrorBoundary>
  );
}
