"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { notifyNewJobPosting } from "@/lib/push/notify";

async function getAdminSupabase() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();

  if (user) {
    const { data } = await admin
      .from("admins")
      .select("id")
      .eq("id", user.id)
      .single();
    if (data) return admin;
  }

  // 개발 환경에서는 미들웨어가 인증을 스킵하므로 허용
  if (process.env.NODE_ENV === "development") return admin;

  return null;
}

export async function createJobPosting(formData: FormData) {
  const db = await getAdminSupabase();
  if (!db) return { error: "관리자 권한이 필요합니다." };

  const clientId = formData.get("client_id") as string;
  const workDate = formData.get("work_date") as string;
  const startTime = formData.get("start_time") as string;
  const endTime = formData.get("end_time") as string;
  const headcount = Number(formData.get("headcount")) || 1;

  if (!clientId || !workDate || !startTime || !endTime) {
    return { error: "모든 항목을 입력해주세요." };
  }

  const { error } = await db.from("job_postings").insert({
    client_id: clientId,
    work_date: workDate,
    start_time: startTime,
    end_time: endTime,
    headcount,
    status: "open",
  });

  if (error) {
    console.error("createJobPosting error:", error);
    return { error: `공고 등록에 실패했습니다: ${error.message}` };
  }

  // 새 공고 푸시 알림 (실패해도 공고 등록에 영향 없음)
  (async () => {
    try {
      const { data: client } = await db.from("clients").select("company_name").eq("id", clientId).single();
      if (client) await notifyNewJobPosting(client.company_name, workDate);
    } catch (e) { console.error("[push] newJobPosting error:", e); }
  })();

  revalidatePath("/admin/jobs");
  revalidatePath("/jobs");
  return { success: true };
}

export async function deleteJobPosting(postingId: string) {
  const db = await getAdminSupabase();
  if (!db) return { error: "관리자 권한이 필요합니다." };

  const { error } = await db
    .from("job_postings")
    .delete()
    .eq("id", postingId);

  if (error) return { error: "공고 삭제에 실패했습니다. 연결된 지원이 있을 수 있습니다." };
  revalidatePath("/admin/jobs");
  revalidatePath("/jobs");
  return { success: true };
}

export async function updateJobPosting(postingId: string, formData: FormData) {
  const db = await getAdminSupabase();
  if (!db) return { error: "관리자 권한이 필요합니다." };

  const workDate = formData.get("work_date") as string;
  const startTime = formData.get("start_time") as string;
  const endTime = formData.get("end_time") as string;
  const headcount = Number(formData.get("headcount")) || 1;
  const status = formData.get("status") as string;

  if (!workDate || !startTime || !endTime) {
    return { error: "모든 항목을 입력해주세요." };
  }

  const { error } = await db
    .from("job_postings")
    .update({ work_date: workDate, start_time: startTime, end_time: endTime, headcount, status })
    .eq("id", postingId);

  if (error) {
    console.error("updateJobPosting error:", error);
    return { error: `수정에 실패했습니다: ${error.message}` };
  }

  revalidatePath("/admin/jobs");
  revalidatePath("/jobs");
  return { success: true };
}

export async function updateJobStatus(postingId: string, status: string) {
  const db = await getAdminSupabase();
  if (!db) return { error: "관리자 권한이 필요합니다." };

  const { error } = await db
    .from("job_postings")
    .update({ status })
    .eq("id", postingId);

  if (error) return { error: "상태 변경에 실패했습니다." };
  revalidatePath("/admin/jobs");
  revalidatePath("/jobs");
  return { success: true };
}
