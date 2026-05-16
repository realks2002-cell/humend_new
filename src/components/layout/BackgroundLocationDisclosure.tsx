"use client";

import { useState, useEffect } from "react";
import { MapPin, Clock, Database, ShieldCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isNative } from "@/lib/capacitor/native";

const STORAGE_KEY = "bg_location_disclosure_v1";

export default function BackgroundLocationDisclosure({ children }: { children: React.ReactNode }) {
  const [seen, setSeen] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isNative()) {
      setSeen(true);
      return;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    setSeen(stored === "true");
  }, []);

  const handleAllow = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { Capacitor } = await import("@capacitor/core");
      const platform = Capacitor.getPlatform();

      const { Geolocation } = await import("@capacitor/geolocation");
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== "granted" && perm.coarseLocation !== "granted") {
        await Geolocation.requestPermissions({ permissions: ["location"] });
      }

      if (platform === "ios") {
        const { requestAlwaysAuthorization } = await import("@/lib/capacitor/native-geofence");
        await requestAlwaysAuthorization();
      } else {
        const { requestBackgroundLocation } = await import("@/lib/capacitor/native-geofence");
        await requestBackgroundLocation();
      }

      localStorage.setItem(STORAGE_KEY, "true");
      setSeen(true);
    } catch (e) {
      console.error("[BgLocationDisclosure] error:", e);
      localStorage.setItem(STORAGE_KEY, "true");
      setSeen(true);
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setSeen(true);
  };

  if (seen === null) return null;
  if (seen) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[99997] flex flex-col bg-white" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className="flex-1 overflow-y-auto px-6 pt-12 pb-32">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "#f9e5ea" }}>
          <MapPin className="h-8 w-8" style={{ color: "#830020" }} />
        </div>

        <h1 className="text-center text-2xl font-bold mb-2">백그라운드 위치 사용 안내</h1>
        <p className="text-center text-sm text-muted-foreground mb-8">
          휴멘드 HR은 <strong>앱이 백그라운드 상태이거나 종료된 경우에도</strong><br />
          위치 정보를 사용합니다.
        </p>

        <div className="rounded-xl border p-5 mb-6" style={{ background: "#fff8e7", borderColor: "#f4d27a" }}>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" style={{ color: "#a06a00" }} />
            <p className="text-sm leading-relaxed" style={{ color: "#3a2a00" }}>
              다음 화면에서 위치 권한을 <strong>"항상 허용"</strong>으로 선택해주세요.
              포그라운드 권한만으로는 출근 자동 확인이 동작하지 않습니다.
            </p>
          </div>
        </div>

        <h2 className="font-semibold text-base mb-4">백그라운드 위치 사용 목적</h2>
        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">출근 자동 확인 (지오펜싱)</p>
              <p className="text-sm text-muted-foreground">
                근무 배정일에 근무지 반경 5km/2km/300m 진입을 OS가 감지해
                자동으로 출근 처리합니다. 앱이 종료된 상태에서도 동작합니다.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">수집 항목</p>
              <p className="text-sm text-muted-foreground">
                근무지 진입 시점의 GPS 좌표만 단발성으로 수집합니다.
                지속적인 위치 추적은 하지 않습니다.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">사용 시점</p>
              <p className="text-sm text-muted-foreground">
                배정된 근무 당일에 한해 출근 시간 ±2시간 사이에만 위치를 사용합니다.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Database className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">보관·공유</p>
              <p className="text-sm text-muted-foreground">
                90일 후 자동 삭제되며, 제3자에게 제공되지 않습니다.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground leading-relaxed">
          거부하시면 출근 자동 확인이 동작하지 않으며, 매 근무일마다 앱을 직접 실행해
          출근 등록을 해야 합니다. 권한은 언제든 마이페이지 → 위치정보 동의에서 변경할 수 있습니다.
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}>
        <Button
          className="w-full h-12 text-base font-bold rounded-xl mb-2"
          onClick={handleAllow}
          disabled={busy}
          style={{ background: "#830020" }}
        >
          위치 권한 설정으로 이동
        </Button>
        <Button
          variant="ghost"
          className="w-full h-10 text-sm text-muted-foreground"
          onClick={handleSkip}
          disabled={busy}
        >
          나중에 설정하기
        </Button>
      </div>
    </div>
  );
}
