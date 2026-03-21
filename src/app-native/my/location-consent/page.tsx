"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Shield, Clock, Eye, Loader2, Smartphone } from "lucide-react";
import { AuthGuard } from "@/lib/native-api/auth-guard";
import { requestLocationPermission } from "@/lib/capacitor/geolocation";
import { updateMemberLocationConsent } from "@/lib/native-api/location-actions";

function ConsentContent() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const handleAgree = async () => {
    setSubmitting(true);

    const permitted = await requestLocationPermission();
    if (!permitted) {
      alert("위치 권한을 허용해주셔야 출근 추적 기능을 이용할 수 있습니다.");
      setSubmitting(false);
      return;
    }

    await updateMemberLocationConsent(true);
    router.push("/my/tracking");
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">위치 정보 수집 동의</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          출근 확인을 위해 위치 정보 수집에 동의해주세요.
        </p>
      </div>

      <Card className="py-0">
        <CardContent className="p-5 space-y-5">
          <div className="space-y-3">
            <h2 className="font-semibold text-base">수집 안내</h2>
            <div className="space-y-2.5">
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">출근 위치 확인</p>
                  <p className="text-xs text-muted-foreground">
                    근무지 도착 시 출근이 자동 처리됩니다. 지각·노쇼 발생 시 대비인원을 신속히 투입하기 위한 목적으로 사용됩니다.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Smartphone className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">백그라운드 위치 수집</p>
                  <p className="text-xs text-muted-foreground">
                    앱을 사용하지 않을 때에도(백그라운드에서) 위치를 수집합니다. 출근길 이동 중 앱을 닫아도 자동 출근 처리가 가능하고, 지각·노쇼 시 대비인원 투입 및 근무 중 근무지 이탈 확인에 사용됩니다.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">수집 시간</p>
                  <p className="text-xs text-muted-foreground">
                    출근 2시간 전부터 도착 확인까지만 수집합니다. 그 외 시간에는 위치를 수집하지 않습니다.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Eye className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">열람 범위</p>
                  <p className="text-xs text-muted-foreground">
                    관리자만 출근 관리 목적으로 열람합니다.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Shield className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">보관 기간</p>
                  <p className="text-xs text-muted-foreground">
                    위치 데이터는 90일 후 자동 삭제됩니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              동의하시면 위치 권한을 요청합니다. 언제든지 앱 설정에서 권한을 취소할 수 있습니다.
            </p>
            <Button
              onClick={handleAgree}
              disabled={submitting}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <MapPin className="h-5 w-5 mr-2" />
              )}
              동의하고 시작하기
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="w-full text-muted-foreground"
            >
              나중에 하기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LocationConsentPage() {
  return (
    <AuthGuard>
      <ConsentContent />
    </AuthGuard>
  );
}
