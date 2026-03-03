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
  const startTime = formData.get("start_time") as string;
  const endTime = formData.get("end_time") as string;
  const headcount = Number(formData.get("headcount")) || 1;
  const postingType = (formData.get("posting_type") as string) || "daily";

  if (!clientId || !startTime || !endTime) {
    return { error: "모든 항목을 입력해주세요." };
  }

  if (postingType === "fixed_term") {
    const startDate = formData.get("start_date") as string;
    const endDate = formData.get("end_date") as string;
    const workDaysStr = formData.get("work_days") as string;
    const title = (formData.get("title") as string) || null;

    if (!startDate || !endDate || !workDaysStr) {
      return { error: "기간제 공고는 시작일, 종료일, 근무요일을 모두 입력해주세요." };
    }

    const workDays = JSON.parse(workDaysStr) as number[];
    if (workDays.length === 0) {
      return { error: "근무요일을 1개 이상 선택해주세요." };
    }

    const { error } = await db.from("job_postings").insert({
      client_id: clientId,
      work_date: startDate, // 하위 호환: start_date 값 사용
      start_time: startTime,
      end_time: endTime,
      headcount,
      status: "open",
      posting_type: "fixed_term",
      start_date: startDate,
      end_date: endDate,
      work_days: workDays,
      title,
    });

    if (error) {
      console.error("createJobPosting (fixed_term) error:", error);
      return { error: `공고 등록에 실패했습니다: ${error.message}` };
    }

    // 푸시 알림
    (async () => {
      try {
        const { data: client } = await db.from("clients").select("company_name").eq("id", clientId).single();
        if (client) await notifyNewJobPosting(client.company_name, `${startDate}~${endDate}`);
      } catch (e) { console.error("[push] newJobPosting error:", e); }
    })();
  } else {
    // daily (기존 로직)
    const workDate = formData.get("work_date") as string;
    if (!workDate) {
      return { error: "근무일을 입력해주세요." };
    }

    const { error } = await db.from("job_postings").insert({
      client_id: clientId,
      work_date: workDate,
      start_time: startTime,
      end_time: endTime,
      headcount,
      status: "open",
      posting_type: "daily",
    });

    if (error) {
      console.error("createJobPosting error:", error);
      return { error: `공고 등록에 실패했습니다: ${error.message}` };
    }

    // 푸시 알림
    (async () => {
      try {
        const { data: client } = await db.from("clients").select("company_name").eq("id", clientId).single();
        if (client) await notifyNewJobPosting(client.company_name, workDate);
      } catch (e) { console.error("[push] newJobPosting error:", e); }
    })();
  }

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

  const startTime = formData.get("start_time") as string;
  const endTime = formData.get("end_time") as string;
  const headcount = Number(formData.get("headcount")) || 1;
  const status = formData.get("status") as string;
  const postingType = (formData.get("posting_type") as string) || "daily";

  if (!startTime || !endTime) {
    return { error: "시간을 입력해주세요." };
  }

  if (postingType === "fixed_term") {
    const startDate = formData.get("start_date") as string;
    const endDate = formData.get("end_date") as string;
    const workDaysStr = formData.get("work_days") as string;
    const title = (formData.get("title") as string) || null;

    if (!startDate || !endDate) {
      return { error: "시작일과 종료일을 입력해주세요." };
    }

    const workDays = workDaysStr ? JSON.parse(workDaysStr) as number[] : undefined;

    const { error } = await db
      .from("job_postings")
      .update({
        start_time: startTime,
        end_time: endTime,
        headcount,
        status,
        start_date: startDate,
        end_date: endDate,
        work_date: startDate, // 하위 호환
        ...(workDays !== undefined ? { work_days: workDays } : {}),
        title,
      })
      .eq("id", postingId);

    if (error) {
      console.error("updateJobPosting (fixed_term) error:", error);
      return { error: `수정에 실패했습니다: ${error.message}` };
    }
  } else {
    const workDate = formData.get("work_date") as string;
    if (!workDate) {
      return { error: "근무일을 입력해주세요." };
    }

    const { error } = await db
      .from("job_postings")
      .update({ work_date: workDate, start_time: startTime, end_time: endTime, headcount, status })
      .eq("id", postingId);

    if (error) {
      console.error("updateJobPosting error:", error);
      return { error: `수정에 실패했습니다: ${error.message}` };
    }
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
