"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  notifyShiftAssigned,
  notifyShiftCancelled,
} from "@/lib/push/attendance-notify";
import { sendPush } from "@/lib/push/fcm";

export async function createShift(
  clientId: string,
  memberIds: string[],
  date: string,
  startTime: string,
  endTime: string,
  options?: {
    alertMinutesBefore?: number;
    alertIntervalMinutes?: number;
    customNotifyMessage?: string;
    customRepeatMessage?: string;
  }
) {
  const supabase = createAdminClient();

  const { data: client } = await supabase
    .from("clients")
    .select("company_name, latitude, longitude")
    .eq("id", clientId)
    .single();

  const records = memberIds.map((memberId) => ({
    client_id: clientId,
    member_id: memberId,
    work_date: date,
    start_time: startTime,
    end_time: endTime,
    arrival_status: "pending" as const,
    ...(options?.alertMinutesBefore != null && {
      alert_minutes_before: options.alertMinutesBefore,
    }),
    ...(options?.alertIntervalMinutes != null && {
      alert_interval_minutes: options.alertIntervalMinutes,
    }),
    ...(options?.customNotifyMessage && {
      custom_notify_message: options.customNotifyMessage,
    }),
    ...(options?.customRepeatMessage && {
      custom_repeat_message: options.customRepeatMessage,
    }),
  }));

  const { data: inserted, error } = await supabase
    .from("daily_shifts")
    .insert(records)
    .select("id, member_id");

  if (error) {
    return { error: error.message };
  }

  const companyName = client?.company_name ?? "근무지";
  const notifyMsg = options?.customNotifyMessage || undefined;
  const lat = client?.latitude;
  const lng = client?.longitude;
  await Promise.allSettled(
    memberIds.map((memberId) => {
      const shiftId = inserted?.find((s) => s.member_id === memberId)?.id;
      return notifyShiftAssigned(memberId, companyName, date, startTime, notifyMsg, shiftId, lat, lng);
    })
  );

  revalidatePath("/admin/shifts");
  return { error: null };
}

export async function deleteShift(shiftId: string) {
  const supabase = createAdminClient();

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

  if (shift) {
    const info = shift as unknown as {
      member_id: string;
      work_date: string;
      start_time: string;
      clients: { company_name: string } | null;
    };
    await notifyShiftCancelled(
      info.member_id,
      info.clients?.company_name ?? "근무지",
      info.work_date,
      info.start_time
    ).catch(console.error);
  }

  revalidatePath("/admin/shifts");
  return { error: null };
}

export async function deleteShiftGroup(shiftIds: string[]) {
  const supabase = createAdminClient();

  const { data: shifts } = await supabase
    .from("daily_shifts")
    .select("id, member_id, work_date, start_time, clients(company_name)")
    .in("id", shiftIds);

  const { error } = await supabase
    .from("daily_shifts")
    .delete()
    .in("id", shiftIds);

  if (error) return { error: error.message };

  if (shifts && shifts.length > 0) {
    await Promise.allSettled(
      shifts.map((s) => {
        const info = s as unknown as {
          member_id: string;
          work_date: string;
          start_time: string;
          clients: { company_name: string } | null;
        };
        return notifyShiftCancelled(
          info.member_id,
          info.clients?.company_name ?? "근무지",
          info.work_date,
          info.start_time
        );
      })
    );
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

  const { data: client } = await supabase
    .from("clients")
    .select("company_name, latitude, longitude")
    .eq("id", clientId)
    .single();
  const companyName = client?.company_name ?? "근무지";

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

  if (addMemberIds.length > 0) {
    const newRecords = addMemberIds.map((memberId) => ({
      client_id: clientId,
      member_id: memberId,
      work_date: newDate,
      start_time: newStartTime,
      end_time: newEndTime,
      arrival_status: "pending" as const,
    }));

    const { data: addedShifts, error } = await supabase
      .from("daily_shifts")
      .insert(newRecords)
      .select("id, member_id");
    if (error) {
      if (error.code === "23505") {
        return { error: "이미 해당 날짜에 배정된 회원이 있습니다." };
      }
      return { error: error.message };
    }

    await Promise.allSettled(
      addMemberIds.map((memberId) => {
        const shiftId = addedShifts?.find((s) => s.member_id === memberId)?.id;
        return notifyShiftAssigned(memberId, companyName, newDate, newStartTime, undefined, shiftId, client?.latitude, client?.longitude);
      })
    );
  }

  if (removeMemberIds.length > 0) {
    const removeShiftIds = existingShifts
      .filter((s) => removeMemberIds.includes(s.member_id))
      .map((s) => s.id);

    const { error } = await supabase
      .from("daily_shifts")
      .delete()
      .in("id", removeShiftIds);

    if (error) return { error: error.message };

    await Promise.allSettled(
      removeMemberIds.map((memberId) =>
        notifyShiftCancelled(memberId, companyName, newDate, newStartTime)
      )
    );
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

export async function updateShiftSortOrder(updates: { shiftIds: string[]; sortOrder: number }[]) {
  const supabase = createAdminClient();
  for (const { shiftIds, sortOrder } of updates) {
    await supabase
      .from("daily_shifts")
      .update({ sort_order: sortOrder })
      .in("id", shiftIds);
  }
  revalidatePath("/admin/shifts");
  return { error: null };
}

export async function sendGroupFcm(
  memberIds: string[],
  title: string,
  body: string,
  memberShiftMap?: Record<string, string>
) {
  if (!title.trim() || memberIds.length === 0) {
    return { error: "메시지와 대상 회원이 필요합니다." };
  }

  const supabase = createAdminClient();

  const { data: tokens } = await supabase
    .from("device_tokens")
    .select("member_id, fcm_token")
    .in("member_id", memberIds);

  if (!tokens || tokens.length === 0) {
    return { error: "발송 가능한 기기가 없습니다." };
  }

  let sentCount = 0;
  for (const t of tokens) {
    const result = await sendPush(t.fcm_token, { title, body, data: { url: "/my/attendance" } });
    if (result.success) sentCount++;
  }

  for (const memberId of memberIds) {
    await supabase.from("notification_logs").insert({
      title,
      body,
      target_type: "individual",
      target_member_id: memberId,
      sent_count: tokens.filter((t) => t.member_id === memberId).length > 0 ? 1 : 0,
      trigger_type: "manual",
      ...(memberShiftMap?.[memberId] && { shift_id: memberShiftMap[memberId] }),
    });
  }

  revalidatePath("/admin/shifts");
  return { error: null, sentCount };
}
