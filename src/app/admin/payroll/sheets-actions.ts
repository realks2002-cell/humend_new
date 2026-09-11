"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { exportToSheets, importFromSheets, protectColumns, formatColumns } from "@/lib/google/sheets";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { notifyPaymentPaid } from "@/lib/push/notify";

const ID_HEADER = "ID(수정금지)";
const WAGE_TYPES = ["시급", "일급"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// "2026-09-01" / "2026. 9. 1" / "2026/9/1" → "2026-09-01", 잘못된 날짜는 null
function normalizeDate(value: string): string | null {
  const m = value.trim().match(/^(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})\.?$/);
  if (!m) return null;
  const iso = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  const d = new Date(`${iso}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().startsWith(iso) ? iso : null;
}

// 월 구분 없이 미처리 급여요청 전체를 한 탭으로 관리
const SHEET_NAME = "급여요청";

// 시간을 소수점 형식으로 변환 (예: "12:30" -> "12.5")
// 구글시트의 자동 시간 형식 변환을 방지하기 위해 문자열로 반환
function timeToDecimal(timeStr: string): string {
  if (!timeStr) return "0";
  const [hours, minutes] = timeStr.split(":").map(Number);
  const decimal = hours + (minutes / 60);
  return decimal.toFixed(1); // 소수점 1자리로 고정
}

// 소수점 시간을 DB time 형식으로 변환 (예: "9" -> "09:00", "12.5" -> "12:30")
function decimalToTime(value: string): string {
  if (!value) return "09:00";
  const num = parseFloat(value);
  if (isNaN(num)) return "09:00";
  const hours = Math.floor(num);
  const minutes = Math.round((num - hours) * 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

// 시작/종료시간으로 휴게시간 자동 계산
// 총 근무시간(종료-시작) >= 9시간 → 1시간, < 9시간 → 0.5시간
function calculateBreakHours(startTime: string, endTime: string): number {
  const start = parseFloat(timeToDecimal(startTime));
  const end = parseFloat(timeToDecimal(endTime));
  let total = end - start;
  if (total < 0) total += 24; // 야간근무
  return total >= 9 ? 1 : 0.5;
}

// RLS 우회용 admin 클라이언트
function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("🔑 Admin Client 설정:", {
    url: url ? "✅ 설정됨" : "❌ 없음",
    serviceRoleKey: key ? `✅ ${key.substring(0, 20)}...` : "❌ 없음",
  });

  if (!url || !key) {
    throw new Error("Supabase URL 또는 Service Role Key가 설정되지 않았습니다.");
  }

  return createSupabaseClient(url, key);
}

export async function exportPayrollToSheets(recordIds?: string[]) {
  await requireAdmin();
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from("work_records")
      .select("*, members(name, phone, rrn_front, rrn_back, bank_name, account_number, account_holder), payments(id)")
      .order("signed_at", { ascending: false });

    if (recordIds && recordIds.length > 0) {
      query = query.in("id", recordIds);
    } else {
      // 서명 완료 + payment 없는 건 전체 (SQL에서 걸러 1,000행 상한 회피)
      query = query.not("signature_url", "is", null).is("payments", null);
    }

    const { data: records } = await query;

    // payment 없는 건만 (미처리 급여요청)
    const recs = ((records ?? []) as Array<Record<string, unknown>>).filter((r) => {
      const payments = r.payments as Array<unknown> | null;
      return !payments || payments.length === 0;
    });

    const sheetName = SHEET_NAME;

    const headers = [
      "상태", "이름", "전화번호", "주민번호", "고객사", "근무일",
      "시작시간", "종료시간", "휴게시간", "근무시간", "시급", "초과수당", "주휴수당",
      "기본급", "총지급액", "국민연금", "건강보험", "장기요양", "고용보험", "소득세", "공제합계",
      "실수령액", "계좌(은행)", "계좌(번호)", "예금주",
      "원본_시급", "원본_기본급", "원본_근무시간", "원본_초과수당", "원본_주휴수당",
      "원본_총지급액",
      "원본_국민연금", "원본_건강보험", "원본_장기요양", "원본_고용보험", "원본_소득세", "원본_공제합계",
      "원본_실수령액",
      "원본_시작시간", "원본_종료시간", "원본_휴게시간",
      "확정여부", "메모", "급여유형", ID_HEADER
    ];

    const rows = recs.map((r, i) => {
      const rowIdx = i + 2; // 헤더=1행, 데이터는 2행부터
      const members = r.members as Record<string, unknown> | null;
      const grossPay = Number(r.gross_pay ?? 0);
      const incomeTax = Math.trunc(grossPay * 0.033 / 10) * 10; // 소득세 3.3% (원본용, 10원 미만 절삭)
      const rawPhone = members?.phone ? String(members.phone).replace(/\D/g, "") : "";
      const phone = rawPhone.length === 11
        ? `${rawPhone.slice(0, 3)}-${rawPhone.slice(3, 7)}-${rawPhone.slice(7)}`
        : rawPhone.length === 10
          ? `${rawPhone.slice(0, 3)}-${rawPhone.slice(3, 6)}-${rawPhone.slice(6)}`
          : rawPhone;

      // 공제합계 = 4대보험 + 소득세
      const totalDeduction =
        Number(r.national_pension ?? 0) +
        Number(r.health_insurance ?? 0) +
        Number(r.long_term_care ?? 0) +
        Number(r.employment_insurance ?? 0) +
        incomeTax;

      const rrnFront = members?.rrn_front ? String(members.rrn_front) : "";
      const rrnBack = members?.rrn_back ? String(members.rrn_back) : "";
      const rrn = rrnFront && rrnBack ? `${rrnFront}-${rrnBack}` : rrnFront || "";

      return [
        r.status, // A: 상태
        members?.name ?? "", // B: 이름
        `'${phone}`, // C: 전화번호 (텍스트 강제)
        `'${rrn}`, // D: 주민번호 (텍스트 강제)
        r.client_name, // E: 고객사
        r.work_date, // F: 근무일
        timeToDecimal(r.start_time as string), // G: 시작시간
        timeToDecimal(r.end_time as string), // H: 종료시간
        calculateBreakHours(r.start_time as string, r.end_time as string), // I: 휴게시간 (자동계산)
        `=H${rowIdx}-G${rowIdx}-I${rowIdx}`, // J: 근무시간 (수식)
        r.hourly_wage, // K: 시급 (이동: 편집 가능)
        `=IF(J${rowIdx}>8,ROUND((J${rowIdx}-8)*K${rowIdx}*1.5),0)`, // L: 초과수당 (수식)
        r.weekly_holiday_pay, // M: 주휴수당 (편집 가능)
        `=ROUND(MIN(J${rowIdx},8)*K${rowIdx})`, // N: 기본급 (수식)
        `=N${rowIdx}+L${rowIdx}+M${rowIdx}`, // O: 총지급액 (수식)
        `=ROUNDDOWN(O${rowIdx}*0.045,-1)`, // P: 국민연금 (4.5%) - 수식
        `=ROUNDDOWN(O${rowIdx}*0.03545,-1)`, // Q: 건강보험 (3.545%) - 수식
        `=ROUNDDOWN(Q${rowIdx}*0.1281,-1)`, // R: 장기요양 (건강보험의 12.81%) - 수식
        `=ROUNDDOWN(O${rowIdx}*0.009,-1)`, // S: 고용보험 (0.9%) - 수식
        `=ROUNDDOWN(O${rowIdx}*0.033,-1)`, // T: 소득세 (3.3%) - 수식
        `=SUM(P${rowIdx}:T${rowIdx})`, // U: 공제합계 - 수식
        `=O${rowIdx}-U${rowIdx}`, // V: 실수령액 - 수식
        members?.bank_name ?? "", // W: 계좌(은행)
        members?.account_number ? `'${String(members.account_number)}` : "", // X: 계좌(번호) (텍스트 강제)
        members?.account_holder ?? "", // Y: 예금주 (NEW)
        r.hourly_wage, // Z: 원본_시급
        r.base_pay, // AA: 원본_기본급
        Number(r.work_hours ?? 0) + Number(r.overtime_hours ?? 0), // AB: 원본_근무시간 (DB값)
        r.overtime_pay, // AC: 원본_초과수당
        r.weekly_holiday_pay, // AD: 원본_주휴수당
        r.gross_pay, // AE: 원본_총지급액
        r.national_pension, // AF: 원본_국민연금
        r.health_insurance, // AG: 원본_건강보험
        r.long_term_care, // AH: 원본_장기요양
        r.employment_insurance, // AI: 원본_고용보험
        incomeTax, // AJ: 원본_소득세
        totalDeduction, // AK: 원본_공제합계
        r.net_pay, // AL: 원본_실수령액
        timeToDecimal(r.start_time as string), // AM: 원본_시작시간
        timeToDecimal(r.end_time as string), // AN: 원본_종료시간
        calculateBreakHours(r.start_time as string, r.end_time as string), // AO: 원본_휴게시간 (자동계산)
        "N", // AP: 확정여부 (항상 미확정으로 시작)
        (r.admin_memo ?? "") as string, // AQ: 메모
        r.wage_type ?? "시급", // AR: 급여유형
        r.id as string, // AS: ID (가져오기 매칭 키)
      ];
    });

    const result = await exportToSheets(sheetName, headers, rows as (string | number)[][]);

    // 이름(B=1), 전화번호(C=2), 주민번호(D=3), 예금주(Y=24), 원본 컬럼(25~40), ID(AS=44) 편집 보호
    await protectColumns(result.sheetId, [1, 2, 3, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 44], rows.length);

    // 숫자 콤마 포맷 + 텍스트 포맷을 단일 batchUpdate로 적용
    const numberColumns = [
      10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,  // 급여 항목 (K~V)
      25, 26, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37,   // 원본 급여 항목 (Z~, +1 shift)
    ];
    const textColumns = [2, 3, 23]; // 전화번호(C), 주민번호(D), 계좌번호(X)
    await formatColumns(result.sheetId, numberColumns, textColumns, rows.length);

    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID ?? "";
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    return { success: true, count: rows.length, sheetUrl };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// 콤마 포함 숫자 문자열 파싱 (예: "3,300" → 3300)
function parseNum(value: string | undefined): number {
  if (!value) return 0;
  const n = Number(String(value).replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

// 이번 가져오기로 지급된 건 중 알림 안 보낸 건만 notified_at으로 선점 → 회원별 1회 푸시 (재가져오기 중복 방지)
async function notifyNewlyPaid(supabase: ReturnType<typeof createAdminClient>, workRecordIds: string[]) {
  const claimedWrIds: string[] = [];
  for (let i = 0; i < workRecordIds.length; i += 200) {
    const { data, error } = await supabase
      .from("payments")
      .update({ notified_at: new Date().toISOString() })
      .in("work_record_id", workRecordIds.slice(i, i + 200))
      .is("notified_at", null)
      .select("work_record_id");
    if (error) {
      console.error("❌ 지급 알림 선점 실패:", error.message);
      continue;
    }
    claimedWrIds.push(...(data ?? []).map((p: { work_record_id: string }) => p.work_record_id));
  }

  const memberIds = new Set<string>();
  for (let i = 0; i < claimedWrIds.length; i += 200) {
    const { data } = await supabase
      .from("work_records")
      .select("member_id")
      .in("id", claimedWrIds.slice(i, i + 200));
    for (const wr of data ?? []) memberIds.add(wr.member_id as string);
  }

  const ids = [...memberIds];
  for (let i = 0; i < ids.length; i += 20) {
    await Promise.allSettled(ids.slice(i, i + 20).map((id) => notifyPaymentPaid(id)));
  }
  return ids.length;
}

export async function importPayrollFromSheets() {
  await requireAdmin();
  try {
    const supabase = createAdminClient();

    // 내보내기가 탭을 하나만 남기므로 첫 탭을 읽음 (이전 "YYYY년M월" 탭도 그대로 가져오기 가능)
    const { sheetName, data: rows } = await importFromSheets();

    console.log("📊 Import 시작:", { sheetName, rowCount: rows.length });

    // 1. ID 없는 행 매칭용: 서명된 work_records 전체 (1,000행 상한 때문에 나눠서 조회)
    const dbRecords: Array<Record<string, unknown>> = [];
    for (let from = 0; ; from += 1000) {
      const { data: page, error: pageError } = await supabase
        .from("work_records")
        .select("id, client_name, work_date, wage_type, members(name, phone)")
        .not("signature_url", "is", null)
        .order("signed_at", { ascending: false })
        .order("id")
        .range(from, from + 999);
      if (pageError) throw new Error(`근무기록 조회 실패: ${pageError.message}`);
      dbRecords.push(...(page ?? []));
      if (!page || page.length < 1000) break;
    }
    console.log("🗄️ DB work_records:", dbRecords.length, "건");

    // ID 열이 있는 행은 ID로 매칭 (근무일·고객사를 고쳐도 같은 건으로 인식)
    const sheetIds = [...new Set(rows.map((r) => r[ID_HEADER]?.trim()).filter((id) => id && UUID_RE.test(id)))];
    const idRecords = new Map<string, Record<string, unknown>>();
    for (let i = 0; i < sheetIds.length; i += 200) {
      const { data: byId, error: idError } = await supabase
        .from("work_records")
        .select("id, client_name, work_date, wage_type, members(name)")
        .in("id", sheetIds.slice(i, i + 200));
      if (idError) throw new Error(`근무기록 조회 실패: ${idError.message}`);
      for (const wr of byId ?? []) idRecords.set(wr.id as string, wr);
    }

    let updated = 0;
    let created = 0;
    const errors: Array<{ name: string; error: string }> = [];
    let skipped = 0;
    const usedIds = new Set<string>(); // 중복 매칭 방지
    const paidWorkRecordIds: string[] = []; // 지급 알림 대상

    for (const row of rows) {
      const sheetName2 = row["이름"]?.trim();
      const rawDate = row["근무일"]?.trim();
      const sheetClient = row["고객사"]?.trim();
      const sheetPhone = row["전화번호"]?.replace(/\D/g, ""); // 숫자만
      const sheetId = row[ID_HEADER]?.trim();
      const sheetWageType = row["급여유형"]?.trim();

      if (!sheetName2 || !rawDate) {
        console.log("⚠️ 이름/근무일 없는 행 스킵");
        continue;
      }

      // 상태 컬럼이 비어있는 행만 import (대기 등 상태값이 있으면 스킵)
      const sheetStatus = row["상태"]?.trim();
      if (sheetStatus) {
        skipped++;
        continue;
      }

      const sheetDate = normalizeDate(rawDate);
      if (!sheetDate) {
        errors.push({ name: sheetName2, error: `근무일 형식 오류(${rawDate}) — 예: 2026-09-01` });
        continue;
      }
      if (sheetWageType && !WAGE_TYPES.includes(sheetWageType)) {
        errors.push({ name: sheetName2, error: `급여유형은 시급/일급만 가능(${sheetWageType})` });
        continue;
      }
      if (sheetId && !idRecords.has(sheetId)) {
        errors.push({ name: sheetName2, error: "ID에 해당하는 근무기록이 없습니다 (ID 열 수정 금지)" });
        continue;
      }
      if (sheetId && usedIds.has(sheetId)) {
        errors.push({ name: sheetName2, error: "같은 ID 행이 중복되었습니다" });
        continue;
      }
      if (sheetId) {
        const rawMember = idRecords.get(sheetId)!.members as { name?: string } | Array<{ name?: string }> | null;
        const dbName = (Array.isArray(rawMember) ? rawMember[0]?.name : rawMember?.name)?.trim();
        if (dbName !== sheetName2) {
          errors.push({ name: sheetName2, error: `이름은 시트에서 수정할 수 없습니다 — 원래 이름(${dbName ?? "-"})으로 되돌려 주세요. 이름 변경은 회원관리에서` });
          continue;
        }
      }

      // 2. DB에서 매칭되는 work_record 찾기 (ID 우선, 없으면 이름·근무일·고객사·전화번호)
      let matched = sheetId ? idRecords.get(sheetId) : dbRecords.find((wr) => {
        if (usedIds.has(wr.id as string)) return false; // 이미 매칭된 ID 제외
        const rawMembers = wr.members as Record<string, unknown> | Array<Record<string, unknown>> | null;
        const m: Record<string, unknown> | null = Array.isArray(rawMembers)
          ? (rawMembers[0] ?? null)
          : (rawMembers ?? null);
        const dbName = (m?.name as string | undefined)?.trim();
        const dbPhone = (m?.phone as string | undefined)?.replace(/\D/g, "");
        const dbDate = wr.work_date as string;
        const dbClient = (wr.client_name as string)?.trim();

        return dbName === sheetName2
          && dbDate === sheetDate
          && dbClient === sheetClient
          && (!sheetPhone || dbPhone === sheetPhone);
      });

      const paymentData = {
        hourly_wage: parseNum(row["시급"]),
        work_hours: parseNum(row["근무시간"]),
        overtime_hours: 0,
        base_pay: parseNum(row["기본급"]),
        overtime_pay: parseNum(row["초과수당"]),
        weekly_holiday_pay: parseNum(row["주휴수당"]),
        gross_pay: parseNum(row["총지급액"]),
        national_pension: parseNum(row["국민연금"]),
        health_insurance: parseNum(row["건강보험"]),
        long_term_care: parseNum(row["장기요양"]),
        employment_insurance: parseNum(row["고용보험"]),
        income_tax: parseNum(row["소득세"]),
        total_deduction: parseNum(row["공제합계"]),
        net_pay: parseNum(row["실수령액"]),
        start_time: decimalToTime(row["시작시간"]),
        end_time: decimalToTime(row["종료시간"]),
        admin_memo: row["메모"] || null,
        status: "지급",
      };

      let newMemberId: string | null = null;
      if (!matched) {
        // 매칭 실패: members에서 이름+전화번호로 조회
        console.log("⚠️ 매칭 실패, 회원 조회 시도:", { 이름: sheetName2, 전화번호: sheetPhone, 고객사: sheetClient });

        if (!sheetPhone) {
          errors.push({ name: sheetName2, error: "전화번호가 없어 회원 조회 불가" });
          continue;
        }

        const { data: memberRows } = await supabase
          .from("members")
          .select("id, name, phone")
          .eq("name", sheetName2)
          .like("phone", `%${sheetPhone.slice(-4)}`);

        const member = (memberRows ?? []).find((m: Record<string, unknown>) => {
          const dbPhone = (m.phone as string)?.replace(/\D/g, "");
          return dbPhone === sheetPhone;
        });

        if (!member) {
          errors.push({ name: sheetName2, error: "등록되지 않은 회원입니다" });
          continue;
        }

        // 이전 가져오기에서 이미 수동 등록된 건이면 재사용 (가져올 때마다 중복 생성 방지)
        const { data: prevManual } = await supabase
          .from("work_records")
          .select("id, client_name, work_date, wage_type")
          .eq("member_id", member.id)
          .eq("work_date", sheetDate)
          .eq("client_name", sheetClient || "")
          .eq("admin_memo", "구글시트 수동 등록")
          .is("signature_url", null)
          .limit(1)
          .maybeSingle();
        if (prevManual && !usedIds.has(prevManual.id)) matched = prevManual;
        else newMemberId = member.id as string;
      }

      if (!matched && newMemberId) {
        // work_record 생성
        const workRecordData = {
          member_id: newMemberId,
          client_name: sheetClient || "",
          work_date: sheetDate,
          start_time: decimalToTime(row["시작시간"]),
          end_time: decimalToTime(row["종료시간"]),
          break_minutes: Math.round(parseNum(row["휴게시간"]) * 60),
          work_hours: paymentData.work_hours,
          overtime_hours: 0,
          hourly_wage: paymentData.hourly_wage,
          base_pay: paymentData.base_pay,
          overtime_pay: paymentData.overtime_pay,
          weekly_holiday_pay: paymentData.weekly_holiday_pay,
          gross_pay: paymentData.gross_pay,
          national_pension: paymentData.national_pension,
          health_insurance: paymentData.health_insurance,
          long_term_care: paymentData.long_term_care,
          employment_insurance: paymentData.employment_insurance,
          income_tax: paymentData.income_tax,
          total_deduction: paymentData.total_deduction,
          net_pay: paymentData.net_pay,
          status: "대기",
          admin_memo: "구글시트 수동 등록",
          wage_type: sheetWageType || "시급",
          posting_id: null,
          application_id: null,
          signature_url: null,
        };

        const { data: newWr, error: wrError } = await supabase
          .from("work_records")
          .insert(workRecordData)
          .select("id")
          .single();

        if (wrError || !newWr) {
          console.error("❌ work_record 생성 에러:", { 이름: sheetName2, error: wrError?.message });
          errors.push({ name: sheetName2, error: wrError?.message || "근무기록 생성 실패" });
          continue;
        }

        const { error: payError } = await supabase
          .from("payments")
          .insert({ work_record_id: newWr.id, ...paymentData });

        if (payError) {
          console.error("❌ payment 생성 에러:", { 이름: sheetName2, error: payError.message });
          errors.push({ name: sheetName2, error: payError.message });
        } else {
          console.log("✅ 신규 생성:", { 이름: sheetName2, workRecordId: newWr.id });
          created++;
          paidWorkRecordIds.push(newWr.id);
        }
        continue;
      }
      if (!matched) continue;

      const workRecordId = matched.id as string;
      usedIds.add(workRecordId); // 중복 매칭 방지

      // 소득세는 구글시트 export에서만 계산 (DB 컬럼 추가 후 활성화)
      // income_tax: Number(row["소득세"]) || 0,

      console.log("💾 저장:", { 이름: sheetName2, workRecordId });

      // 계약서에 표시되는 근무장소·근무일·급여유형을 시트 값으로 갱신 (서명된 계약서 포함)
      const wrUpdate: Record<string, string> = {};
      if (sheetClient && sheetClient !== matched.client_name) wrUpdate.client_name = sheetClient;
      if (sheetDate !== matched.work_date) wrUpdate.work_date = sheetDate;
      if (sheetWageType && sheetWageType !== matched.wage_type) wrUpdate.wage_type = sheetWageType;
      if (Object.keys(wrUpdate).length > 0) {
        const { error: wrError } = await supabase.from("work_records").update(wrUpdate).eq("id", workRecordId);
        if (wrError) {
          console.error("❌ 근무기록 갱신 에러:", { 이름: sheetName2, error: wrError.message });
          errors.push({ name: sheetName2, error: wrError.message });
          continue;
        }
      }

      // 3. UPSERT
      const { error } = await supabase
        .from("payments")
        .upsert(
          { work_record_id: workRecordId, ...paymentData },
          { onConflict: "work_record_id" }
        );

      if (error) {
        console.error("❌ 저장 에러:", { 이름: sheetName2, error: error.message });
        errors.push({ name: sheetName2, error: error.message });
      } else {
        console.log("✅ 저장 성공:", { 이름: sheetName2, workRecordId });
        updated++;
        paidWorkRecordIds.push(workRecordId);
      }
    }

    const notified = await notifyNewlyPaid(supabase, paidWorkRecordIds);

    console.log("📊 Import 완료:", { updated, created, skipped, notified, errorCount: errors.length });

    revalidatePath("/admin/payroll");

    if (errors.length > 0) {
      return {
        success: true,
        updated,
        created,
        skipped,
        errors: errors.map(e => `${e.name}: ${e.error}`).join(", ")
      };
    }

    return { success: true, updated, created, skipped };
  } catch (e) {
    console.error("❌ Import 실패:", e);
    return { error: (e as Error).message };
  }
}
