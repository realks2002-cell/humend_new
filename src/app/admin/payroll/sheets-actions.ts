"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { exportToSheets, importFromSheets, protectColumns, formatNumberColumns } from "@/lib/google/sheets";
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
      .select("*, members(name, phone, rrn_front, rrn_back, bank_name, account_number), payments(id)")
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
      "상태", "이름", "전화번호", "주민번호", "고객사", "근무일",
      "시작시간", "종료시간", "휴게시간", "근무시간", "초과수당", "주휴수당", "시급",
      "기본급", "총지급액", "국민연금", "건강보험", "장기요양", "고용보험", "소득세", "공제합계",
      "실수령액", "계좌(은행)", "계좌(번호)",
      "원본_시급", "원본_기본급", "원본_근무시간", "원본_초과수당", "원본_주휴수당",
      "원본_총지급액",
      "원본_국민연금", "원본_건강보험", "원본_장기요양", "원본_고용보험", "원본_소득세", "원본_공제합계",
      "원본_실수령액",
      "원본_시작시간", "원본_종료시간", "원본_휴게시간",
      "확정여부", "메모", "급여유형"
    ];

    const rows = recs.map((r, i) => {
      const rowIdx = i + 2; // 헤더=1행, 데이터는 2행부터
      const members = r.members as Record<string, unknown> | null;
      const grossPay = Number(r.gross_pay ?? 0);
      const incomeTax = Math.round(grossPay * 0.033); // 소득세 3.3% (원본용)
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
        r.status, // 상태
        members?.name ?? "", // 이름
        `'${phone}`, // 전화번호 (텍스트 형식)
        rrn ? `'${rrn}` : "", // 주민번호 (텍스트 형식)
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
        `=ROUND(O${rowIdx}*0.033)`, // 소득세 (3.3%) - 수식
        `=SUM(P${rowIdx}:T${rowIdx})`, // 공제합계 - 수식
        `=O${rowIdx}-U${rowIdx}`, // 실수령액 - 수식
        members?.bank_name ?? "", // 계좌(은행)
        members?.account_number ?? "", // 계좌(번호)
        r.hourly_wage, // 원본_시급
        r.base_pay, // 원본_기본급
        Number(r.work_hours ?? 0) + Number(r.overtime_hours ?? 0), // 원본_근무시간
        r.overtime_pay, // 원본_초과수당
        r.weekly_holiday_pay, // 원본_주휴수당
        r.gross_pay, // 원본_총지급액
        r.national_pension, // 원본_국민연금
        r.health_insurance, // 원본_건강보험
        r.long_term_care, // 원본_장기요양
        r.employment_insurance, // 원본_고용보험
        incomeTax, // 원본_소득세
        totalDeduction, // 원본_공제합계
        r.net_pay, // 원본_실수령액
        timeToDecimal(r.start_time as string), // 원본_시작시간
        timeToDecimal(r.end_time as string), // 원본_종료시간
        Number(r.break_hours ?? 0), // 원본_휴게시간
        "N", // 확정여부 (항상 미확정으로 시작)
        (r.admin_memo ?? "") as string, // 메모
        r.wage_type ?? "시급", // 급여유형
      ];
    });

    const result = await exportToSheets(sheetName, headers, rows as (string | number)[][]);

    // 이름(B=1), 전화번호(C=2), 주민번호(D=3), 원본 컬럼(24~39) 편집 보호
    await protectColumns(result.sheetId, [1, 2, 3, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39], rows.length);

    // 급여 숫자 컬럼에 세자릿수 콤마 포맷 적용
    const salaryColumns = [
      10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,  // 급여 항목
      24, 25, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,   // 원본 급여 항목
    ];
    await formatNumberColumns(result.sheetId, salaryColumns, rows.length);

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

// 숫자 컬럼의 현재 값과 원본 값을 비교하여 수정 여부를 감지
function detectModification(row: Record<string, string>, debugLabel?: string): boolean {
  const comparisons = [
    ["시급", "원본_시급"],
    ["기본급", "원본_기본급"],
    ["근무시간", "원본_근무시간"],
    ["초과수당", "원본_초과수당"],
    ["주휴수당", "원본_주휴수당"],
    ["총지급액", "원본_총지급액"],
    ["국민연금", "원본_국민연금"],
    ["건강보험", "원본_건강보험"],
    ["장기요양", "원본_장기요양"],
    ["고용보험", "원본_고용보험"],
    // 소득세, 공제합계, 실수령액 제거 — 수식 자동계산 컬럼이라 원본과 구조적으로 불일치
    ["시작시간", "원본_시작시간"],
    ["종료시간", "원본_종료시간"],
    ["휴게시간", "원본_휴게시간"],
  ];

  if (debugLabel) {
    console.log(`🔍 [detectModification] ${debugLabel} — 비교 시작`);
    for (const [current, original] of comparisons) {
      const rawCurr = row[current];
      const rawOrig = row[original];
      const curr = parseNum(row[current]);
      const orig = parseNum(row[original]);
      if (curr !== orig) {
        console.log(`  ✏️ 차이 발견: ${current}="${rawCurr}"(${curr}) vs ${original}="${rawOrig}"(${orig})`);
      }
    }
  }

  return comparisons.some(([current, original]) => {
    const curr = parseNum(row[current]);
    const orig = parseNum(row[original]);
    return curr !== orig;
  });
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
    let skipped = 0;
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

      // 상태와 무관하게 숫자 변경 여부만으로 import 결정
      const debugLabel = skipped === 0 && updated === 0 && created === 0
        ? `${sheetName2} (${sheetDate})` : undefined; // 첫 번째 행만 디버깅
      const isModified = detectModification(row, debugLabel);
      if (!isModified) {
        console.log("⏭️ 변경 없음, 스킵:", { 이름: sheetName2, 근무일: sheetDate });
        skipped++;
        continue;
      }
      console.log("🔄 수정 감지, import 처리:", { 이름: sheetName2, 근무일: sheetDate });

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
        total_deduction: parseNum(row["공제합계"]),
        net_pay: parseNum(row["실수령액"]),
        start_time: decimalToTime(row["시작시간"]),
        end_time: decimalToTime(row["종료시간"]),
        admin_memo: row["메모"] || null,
        status: "지급",
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
          break_hours: parseNum(row["휴게시간"]),
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

    console.log("📊 Import 완료:", { updated, created, skipped, errorCount: errors.length });

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
