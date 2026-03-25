"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  notifyShiftAssigned,
  notifyShiftCancelled,
} from "@/lib/push/attendance-notify";

export async function createShift(
  clientId: string,
  memberIds: string[],
  date: string,
  startTime: string,
  endTime: string
) {
  const supabase = createAdminClient();

  // 고객사 정보 (알림용)
  const { data: client } = await supabase
    .from("clients")
    .select("company_name")
    .eq("id", clientId)
    .single();

  const records = memberIds.map((memberId) => ({
    client_id: clientId,
    member_id: memberId,
    work_date: date,
    start_time: startTime,
    end_time: endTime,
    arrival_status: "pending" as const,
  }));

  const { error } = await supabase.from("daily_shifts").insert(records);

  if (error) {
    if (error.code === "23505") {
      return { error: "이미 해당 날짜에 배정된 회원이 있습니다." };
    }
    return { error: error.message };
  }

  // FCM 알림 (비동기, 실패해도 배정은 유지)
  const companyName = client?.company_name ?? "근무지";
  for (const memberId of memberIds) {
    notifyShiftAssigned(memberId, companyName, date, startTime).catch(
      console.error
    );
  }

  revalidatePath("/admin/shifts");
  return { error: null };
}

export async function deleteShift(shiftId: string) {
  const supabase = createAdminClient();

  // 삭제 전 정보 조회 (알림용)
  const { data: shift } = await supabase
    .from("daily_shifts")
    .select("member_id, work_date, start_time, clients(company_name)")
    .eq("id", shiftId)
    .single();

  const { error } = await supabase
    .from("daily_shifts")
    .delete()
    .eq("id", shiftId);

  if (error) {
    return { error: error.message };
  }

  // FCM 취소 알림
  if (shift) {
    const info = shift as unknown as {
      member_id: string;
      work_date: string;
      start_time: string;
      clients: { company_name: string } | null;
    };
    notifyShiftCancelled(
      info.member_id,
      info.clients?.company_name ?? "근무지",
      info.work_date,
      info.start_time
    ).catch(console.error);
  }

  revalidatePath("/admin/shifts");
  return { error: null };
}

export async function updateShiftGroup(
  shiftIds: string[],
  clientId: string,
  newDate: string,
  newStartTime: string,
  newEndTime: string,
  newMemberIds: string[]
) {
  const supabase = createAdminClient();

  // 기존 shifts 조회 → 현재 member_id 목록 추출
  const { data: existingShifts, error: fetchError } = await supabase
    .from("daily_shifts")
    .select("id, member_id")
    .in("id", shiftIds);

  if (fetchError) return { error: fetchError.message };
  if (!existingShifts || existingShifts.length === 0) {
    return { error: "수정할 근무 배정을 찾을 수 없습니다." };
  }

  const existingMemberIds = existingShifts.map((s) => s.member_id);
  const keepMemberIds = newMemberIds.filter((id) => existingMemberIds.includes(id));
  const addMemberIds = newMemberIds.filter((id) => !existingMemberIds.includes(id));
  const removeMemberIds = existingMemberIds.filter((id) => !newMemberIds.includes(id));

  // 고객사 정보 (알림용)
  const { data: client } = await supabase
    .from("clients")
    .select("company_name")
    .eq("id", clientId)
    .single();
  const companyName = client?.company_name ?? "근무지";

  // 유지할 회원: work_date, start_time, end_time UPDATE
  if (keepMemberIds.length > 0) {
    const keepShiftIds = existingShifts
      .filter((s) => keepMemberIds.includes(s.member_id))
      .map((s) => s.id);

    const { error } = await supabase
      .from("daily_shifts")
      .update({
        work_date: newDate,
        start_time: newStartTime,
        end_time: newEndTime,
      })
      .in("id", keepShiftIds);

    if (error) {
      if (error.code === "23505") {
        return { error: "이미 해당 날짜에 배정된 회원이 있습니다." };
      }
      return { error: error.message };
    }
  }

  // 추가할 회원: INSERT + FCM 알림
  if (addMemberIds.length > 0) {
    const newRecords = addMemberIds.map((memberId) => ({
      client_id: clientId,
      member_id: memberId,
      work_date: newDate,
      start_time: newStartTime,
      end_time: newEndTime,
      arrival_status: "pending" as const,
    }));

    const { error } = await supabase.from("daily_shifts").insert(newRecords);
    if (error) {
      if (error.code === "23505") {
        return { error: "이미 해당 날짜에 배정된 회원이 있습니다." };
      }
      return { error: error.message };
    }

    for (const memberId of addMemberIds) {
      notifyShiftAssigned(memberId, companyName, newDate, newStartTime).catch(
        console.error
      );
    }
  }

  // 제거할 회원: DELETE + FCM 취소 알림
  if (removeMemberIds.length > 0) {
    const removeShiftIds = existingShifts
      .filter((s) => removeMemberIds.includes(s.member_id))
      .map((s) => s.id);

    const { error } = await supabase
      .from("daily_shifts")
      .delete()
      .in("id", removeShiftIds);

    if (error) return { error: error.message };

    for (const memberId of removeMemberIds) {
      notifyShiftCancelled(memberId, companyName, newDate, newStartTime).catch(
        console.error
      );
    }
  }

  revalidatePath("/admin/shifts");
  return { error: null };
}

export async function updateShiftStatus(
  shiftId: string,
  status: "arrived" | "noshow"
) {
  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = {
    arrival_status: status,
  };

  if (status === "arrived") {
    updateData.arrived_at = new Date().toISOString();
  }
  const { error } = await supabase
    .from("daily_shifts")
    .update(updateData)
    .eq("id", shiftId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/shifts");
  return { error: null };
}
