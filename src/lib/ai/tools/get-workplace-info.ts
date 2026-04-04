import { tool } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

export const getWorkplaceInfo = () =>
  tool({
    description: "근무지(고객사) 정보를 조회합니다. 주소, 연락처, 사진, 길찾기 링크를 제공합니다.",
    inputSchema: z.object({
      companyName: z.string().describe("고객사 이름 (부분 일치 검색)"),
    }),
    execute: async ({ companyName }) => {
      const supabase = createAdminClient();

      const { data: clients } = await supabase
        .from("clients")
        .select(`
          id, company_name, location, contact_person, contact_phone,
          latitude, longitude, dress_code, work_guidelines,
          client_photos (image_url)
        `)
        .ilike("company_name", `%${companyName}%`)
        .eq("status", "active")
        .limit(3);

      if (!clients || clients.length === 0) {
        return { found: false, message: `"${companyName}" 관련 근무지를 찾을 수 없습니다.` };
      }

      return {
        found: true,
        workplaces: clients.map((c) => ({
          name: c.company_name,
          address: c.location,
          contact: c.contact_phone,
          contactPerson: c.contact_person,
          dressCode: c.dress_code,
          guidelines: c.work_guidelines,
          mapLink: c.latitude && c.longitude
            ? `https://maps.google.com/?q=${c.latitude},${c.longitude}`
            : null,
          photos: (c.client_photos as unknown as { image_url: string }[])?.map((p) => p.image_url) ?? [],
        })),
      };
    },
  });
