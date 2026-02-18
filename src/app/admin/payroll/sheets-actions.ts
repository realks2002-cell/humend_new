"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { exportToSheets, importFromSheets, protectColumns } from "@/lib/google/sheets";
import { revalidatePath } from "next/cache";

function toSheetName(month: string) {
  const [y, m] = month.split("-");
  return `${y}년${Number(m)}월`;
}

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

export async function exportPayrollToSheets(month: string) {
  try {
    const supabase = createAdminClient();

    const start = `${month}-01`;
    const endDate = new Date(Number(month.split("-")[0]), Number(month.split("-")[1]), 0);
    const end = `${month}-${String(endDate.getDate()).padStart(2, "0")}`;

    const { data: records } = await supabase
      .from("work_records")
      .select("*, members(name, phone, bank_name, account_number), payments(id)")
      .gte("work_date", start)
      .lte("work_date", end)
      .not("signature_url", "is", null)
      .order("work_date", { ascending: false });

    // 서명 완료 + payment 없는 건만 (미처리 급여요청)
    const recs = ((records ?? []) as Array<Record<string, unknown>>).filter((r) => {
      const payments = r.payments as Array<unknown> | null;
      return !payments || payments.length === 0;
    });

    const sheetName = toSheetName(month);

    const headers = [
      "상태", "이름", "전화번호", "고객사", "근무일",
      "시작시간", "종료시간", "휴게시간", "근무시간", "초과수당", "주휴수당", "시급",
      "기본급", "총지급액", "국민연금", "건강보험", "장기요양", "고용보험", "소득세", "공제합계",
      "실수령액", "계좌(은행)", "계좌(번호)",
      "원본_총지급액", "원본_실수령액", "확정여부", "메모", "급여유형"
    ];

    const rows = recs.map((r) => {
      const members = r.members as Record<string, unknown> | null;
      const grossPay = Number(r.gross_pay ?? 0);
      const incomeTax = Math.round(grossPay * 0.033); // 소득세 3.3% 계산
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

      return [
        r.status, // 상태
        members?.name ?? "", // 이름
        `'${phone}`, // 전화번호 (텍스트 형식)
        r.client_name, // 고객사
        r.work_date, // 근무일
        timeToDecimal(r.start_time as string), // 시작시간
        timeToDecimal(r.end_time as string), // 종료시간
        Number(r.break_hours ?? 0), // 휴게시간
        Number(r.work_hours ?? 0) + Number(r.overtime_hours ?? 0), // 근무시간
        r.overtime_pay, // 초과수당
        r.weekly_holiday_pay, // 주휴수당
        r.hourly_wage, // 시급
        r.base_pay, // 기본급
        grossPay, // 총지급액
        r.national_pension, // 국민연금
        r.health_insurance, // 건강보험
        r.long_term_care, // 장기요양
        r.employment_insurance, // 고용보험
        incomeTax, // 소득세 (3.3%)
        totalDeduction, // 공제합계 (4대보험 + 소득세)
        r.net_pay, // 실수령액
        members?.bank_name ?? "", // 계좌(은행)
        members?.account_number ?? "", // 계좌(번호)
        r.gross_pay, // 원본_총지급액
        r.net_pay, // 원본_실수령액
        "N", // 확정여부 (항상 미확정으로 시작)
        (r.admin_memo ?? "") as string, // 메모
        r.wage_type ?? "시급", // 급여유형
      ];
    });

    const result = await exportToSheets(sheetName, headers, rows as (string | number)[][]);

    // 이름(B=1), 전화번호(C=2) 컬럼 편집 보호
    await protectColumns(result.sheetId, [1, 2], rows.length);

    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID ?? "";
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    return { success: true, count: rows.length, sheetUrl };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function importPayrollFromSheets(month: string) {
  try {
    const supabase = createAdminClient();

    const sheetName = toSheetName(month);
    const { data: rows } = await importFromSheets(sheetName);

    console.log("📊 Import 시작:", { month, sheetName, rowCount: rows.length });

    // 1. 해당 월의 모든 work_records를 DB에서 가져오기 (매칭용)
    const start = `${month}-01`;
    const endDate = new Date(Number(month.split("-")[0]), Number(month.split("-")[1]), 0);
    const end = `${month}-${String(endDate.getDate()).padStart(2, "0")}`;

    const { data: workRecords } = await supabase
      .from("work_records")
      .select("id, client_name, work_date, members(name, phone)")
      .gte("work_date", start)
      .lte("work_date", end)
      .not("signature_url", "is", null);

    const dbRecords = (workRecords ?? []) as Array<Record<string, unknown>>;
    console.log("🗄️ DB work_records:", dbRecords.length, "건");

    let updated = 0;
    let created = 0;
    const errors: Array<{ name: string; error: string }> = [];
    const usedIds = new Set<string>(); // 중복 매칭 방지

    for (const row of rows) {
      const sheetName2 = row["이름"]?.trim();
      const sheetDate = row["근무일"]?.trim();
      const sheetClient = row["고객사"]?.trim();
      const sheetPhone = row["전화번호"]?.replace(/\D/g, ""); // 숫자만

      if (!sheetName2 || !sheetDate) {
        console.log("⚠️ 이름/근무일 없는 행 스킵");
        continue;
      }

      // 2. DB에서 매칭되는 work_record 찾기
      const matched = dbRecords.find((wr) => {
        if (usedIds.has(wr.id as string)) return false; // 이미 매칭된 ID 제외
        const m = wr.members as Record<string, unknown> | null;
        const dbName = (m?.name as string)?.trim();
        const dbPhone = (m?.phone as string)?.replace(/\D/g, "");
        const dbDate = wr.work_date as string;
        const dbClient = (wr.client_name as string)?.trim();

        return dbName === sheetName2
          && dbDate === sheetDate
          && dbClient === sheetClient
          && (!sheetPhone || dbPhone === sheetPhone);
      });

      const paymentData = {
        hourly_wage: Number(row["시급"]) || 0,
        work_hours: Number(row["근무시간"]) || 0,
        overtime_hours: 0,
        base_pay: Number(row["기본급"]) || 0,
        overtime_pay: Number(row["초과수당"]) || 0,
        weekly_holiday_pay: Number(row["주휴수당"]) || 0,
        gross_pay: Number(row["총지급액"]) || 0,
        national_pension: Number(row["국민연금"]) || 0,
        health_insurance: Number(row["건강보험"]) || 0,
        long_term_care: Number(row["장기요양"]) || 0,
        employment_insurance: Number(row["고용보험"]) || 0,
        total_deduction: Number(row["공제합계"]) || 0,
        net_pay: Number(row["실수령액"]) || 0,
        admin_memo: row["메모"] || null,
        status: row["상태"] || "확정",
      };

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

        // work_record 생성
        const workRecordData = {
          member_id: member.id,
          client_name: sheetClient || "",
          work_date: sheetDate,
          start_time: decimalToTime(row["시작시간"]),
          end_time: decimalToTime(row["종료시간"]),
          break_hours: Number(row["휴게시간"]) || 0,
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
          total_deduction: paymentData.total_deduction,
          net_pay: paymentData.net_pay,
          status: "대기",
          admin_memo: "구글시트 수동 등록",
          wage_type: row["급여유형"] || "시급",
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
        }
        continue;
      }

      const workRecordId = matched.id as string;
      usedIds.add(workRecordId); // 중복 매칭 방지

      // 소득세는 구글시트 export에서만 계산 (DB 컬럼 추가 후 활성화)
      // income_tax: Number(row["소득세"]) || 0,

      console.log("💾 저장:", { 이름: sheetName2, workRecordId });

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
      }
    }

    console.log("📊 Import 완료:", { updated, created, errorCount: errors.length });

    revalidatePath("/admin/payroll");

    if (errors.length > 0) {
      return {
        success: true,
        updated,
        created,
        errors: errors.map(e => `${e.name}: ${e.error}`).join(", ")
      };
    }

    return { success: true, updated, created };
  } catch (e) {
    console.error("❌ Import 실패:", e);
    return { error: (e as Error).message };
  }
}
