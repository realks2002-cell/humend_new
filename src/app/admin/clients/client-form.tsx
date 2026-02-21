"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus, Pencil } from "lucide-react";
import { createClientAction, updateClientAction } from "./actions";
import { ImageUpload } from "@/components/ui/image-upload";
import { RichEditor } from "@/components/ui/rich-editor";
import { GoogleMap } from "@/components/ui/google-map";
import { PREPARATION_GUIDE_HTML } from "./preparation-guide-html";
import { Checkbox } from "@/components/ui/checkbox";

interface ClientData {
  id: string;
  company_name: string;
  location: string;
  hourly_wage: number;
  contact_person: string | null;
  contact_phone: string | null;
  dress_code: string | null;
  work_guidelines: string | null;
  description: string | null;
  latitude?: number | null;
  longitude?: number | null;
  total_headcount?: number | null;
  work_type?: string | null;
  gender_requirement?: string | null;
  application_method?: string | null;
  work_category?: string | null;
  client_photos?: { id: string; image_url: string; sort_order: number }[];
}

export function CreateClientButton() {
  return <ClientFormDialog mode="create" />;
}

export function EditClientButton({ client }: { client: ClientData }) {
  return <ClientFormDialog mode="edit" client={client} />;
}

function ClientFormDialog({
  mode,
  client,
}: {
  mode: "create" | "edit";
  client?: ClientData;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [photoUrls, setPhotoUrls] = useState<string[]>(
    client?.client_photos?.sort((a, b) => a.sort_order - b.sort_order).map((p) => p.image_url) ?? []
  );
  const [pendingDataUrls, setPendingDataUrls] = useState<string[]>([]);
  const [workGuidelines, setWorkGuidelines] = useState(client?.work_guidelines ?? "");
  const [useDefaultGuide, setUseDefaultGuide] = useState(
    client?.work_guidelines === PREPARATION_GUIDE_HTML
  );
  const [description, setDescription] = useState(client?.description ?? "");
  const [latitude, setLatitude] = useState<number | null>(client?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(client?.longitude ?? null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("work_guidelines", workGuidelines);
    formData.set("description", description);
    formData.set("photo_urls", JSON.stringify(photoUrls));
    if (pendingDataUrls.length > 0) {
      formData.set("new_photo_data", JSON.stringify(pendingDataUrls));
    }
    if (latitude !== null) formData.set("latitude", String(latitude));
    if (longitude !== null) formData.set("longitude", String(longitude));

    const result =
      mode === "create"
        ? await createClientAction(formData)
        : await updateClientAction(client!.id, formData);

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  };

  const handleDialogChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setPendingDataUrls([]);
      if (mode === "edit") {
        setPhotoUrls(
          client?.client_photos?.sort((a, b) => a.sort_order - b.sort_order).map((p) => p.image_url) ?? []
        );
        setWorkGuidelines(client?.work_guidelines ?? "");
        setDescription(client?.description ?? "");
        setUseDefaultGuide(client?.work_guidelines === PREPARATION_GUIDE_HTML);
        setLatitude(client?.latitude ?? null);
        setLongitude(client?.longitude ?? null);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button>
            <Plus className="mr-1 h-4 w-4" />
            고객사 등록
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "고객사 등록" : "고객사 수정"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          {/* 현장 사진 */}
          <div>
            <Label>현장 사진 (최대 3장)</Label>
            <div className="mt-1.5">
              <ImageUpload value={photoUrls} onChange={setPhotoUrls} pendingDataUrls={pendingDataUrls} onPendingChange={setPendingDataUrls} maxCount={3} />
            </div>
          </div>

          <div>
            <Label htmlFor="company_name">고객사명 *</Label>
            <Input
              id="company_name"
              name="company_name"
              required
              defaultValue={client?.company_name}
              placeholder="그랜드웨딩홀"
            />
          </div>
          <div>
            <Label htmlFor="location">위치</Label>
            <Input
              id="location"
              name="location"
              defaultValue={client?.location}
              placeholder="강남역 사거리에서 500미터 직진"
            />
          </div>

          {/* 구글맵 주소 검색 */}
          <div>
            <Label>지도 위치</Label>
            <div className="mt-1.5">
              <GoogleMap
                latitude={latitude}
                longitude={longitude}
                editable
                onLocationChange={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="hourly_wage">시급 (원) *</Label>
            <Input
              id="hourly_wage"
              name="hourly_wage"
              type="number"
              required
              defaultValue={client?.hourly_wage}
              placeholder="12000"
            />
          </div>
          <div>
            <Label htmlFor="work_type">근무타입</Label>
            <Input
              id="work_type"
              name="work_type"
              defaultValue={client?.work_type ?? ""}
              placeholder="종일근무"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="gender_requirement">성별</Label>
              <Input
                id="gender_requirement"
                name="gender_requirement"
                defaultValue={client?.gender_requirement ?? ""}
                placeholder="성별무관"
              />
            </div>
            <div>
              <Label htmlFor="work_category">업무형태</Label>
              <Input
                id="work_category"
                name="work_category"
                defaultValue={client?.work_category ?? ""}
                placeholder="주방"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="contact_person">현장 담당자</Label>
              <Input
                id="contact_person"
                name="contact_person"
                defaultValue={client?.contact_person ?? ""}
                placeholder="홍길동"
              />
            </div>
            <div>
              <Label htmlFor="contact_phone">담당자 연락처</Label>
              <Input
                id="contact_phone"
                name="contact_phone"
                defaultValue={client?.contact_phone ?? ""}
                placeholder="01012345678"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="dress_code">복장 안내</Label>
            <Input
              id="dress_code"
              name="dress_code"
              defaultValue={client?.dress_code ?? ""}
              placeholder="검은색 정장, 흰색 셔츠"
            />
          </div>

          {/* 근무 가이드 - 체크박스 + 리치 에디터 */}
          <div>
            <Label>근무 가이드</Label>
            <div className="mt-1.5 flex items-center gap-2 mb-2">
              <Checkbox
                checked={useDefaultGuide}
                onCheckedChange={(checked) => {
                  const on = checked === true;
                  setUseDefaultGuide(on);
                  setWorkGuidelines(on ? PREPARATION_GUIDE_HTML : "");
                }}
              />
              <span
                className="text-sm font-medium cursor-pointer select-none"
                onClick={() => {
                  const on = !useDefaultGuide;
                  setUseDefaultGuide(on);
                  setWorkGuidelines(on ? PREPARATION_GUIDE_HTML : "");
                }}
              >
                기본 준비물 안내 사용
              </span>
            </div>
            <div className="mt-1.5">
              {useDefaultGuide ? (
                <iframe
                  srcDoc={`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700;900&family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet"></head><body>${PREPARATION_GUIDE_HTML}</body></html>`}
                  sandbox="allow-scripts"
                  className="w-full h-[400px] rounded-md border"
                  title="기본 준비물 안내 미리보기"
                />
              ) : (
                <RichEditor
                  value={workGuidelines}
                  onChange={setWorkGuidelines}
                  placeholder="행사 시작 30분 전 도착..."
                />
              )}
            </div>
          </div>

          <div>
            <Label>설명</Label>
            <div className="mt-1.5">
              <RichEditor
                value={description}
                onChange={setDescription}
                placeholder="고객사에 대한 추가 설명"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "등록" : "저장"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
