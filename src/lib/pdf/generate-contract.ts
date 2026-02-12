import { jsPDF } from "jspdf";
import type { WorkRecord } from "@/lib/supabase/queries";

/**
 * 근로계약서 PDF 생성 (클라이언트 사이드)
 */
export function generateContractPDF(record: WorkRecord) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  let y = 20;
  const left = 20;
  const right = 190;

  // 제목
  doc.setFontSize(18);
  doc.text("근로계약서", 105, y, { align: "center" });
  y += 15;

  // 구분선
  doc.setLineWidth(0.5);
  doc.line(left, y, right, y);
  y += 10;

  doc.setFontSize(10);

  // 근무 정보
  addSection(doc, "1. 근무 정보", y, left);
  y += 8;
  addRow(doc, "고객사", record.client_name, y, left);
  y += 6;
  addRow(doc, "근무일", record.work_date, y, left);
  y += 6;
  addRow(doc, "근무시간", `${record.start_time.slice(0, 5)} ~ ${record.end_time.slice(0, 5)}`, y, left);
  y += 6;
  addRow(doc, "실근무시간", `${record.work_hours}시간`, y, left);
  y += 6;
  if (record.overtime_hours > 0) {
    addRow(doc, "연장근무", `${record.overtime_hours}시간`, y, left);
    y += 6;
  }
  y += 5;

  // 급여 내역
  addSection(doc, "2. 급여 내역", y, left);
  y += 8;
  addRow(doc, "시급", formatNum(record.hourly_wage) + "원", y, left);
  y += 6;
  addRow(doc, "기본급", formatNum(record.base_pay) + "원", y, left);
  y += 6;
  if (record.overtime_pay > 0) {
    addRow(doc, "연장수당 (1.5배)", formatNum(record.overtime_pay) + "원", y, left);
    y += 6;
  }
  if (record.weekly_holiday_pay > 0) {
    addRow(doc, "주휴수당", formatNum(record.weekly_holiday_pay) + "원", y, left);
    y += 6;
  }
  addRow(doc, "총 지급액", formatNum(record.gross_pay) + "원", y, left);
  y += 8;

  // 4대보험 공제
  addSection(doc, "3. 4대보험 공제", y, left);
  y += 8;
  addRow(doc, "국민연금 (4.5%)", "-" + formatNum(record.national_pension) + "원", y, left);
  y += 6;
  addRow(doc, "건강보험 (3.545%)", "-" + formatNum(record.health_insurance) + "원", y, left);
  y += 6;
  addRow(doc, "장기요양 (12.81%)", "-" + formatNum(record.long_term_care) + "원", y, left);
  y += 6;
  addRow(doc, "고용보험 (0.9%)", "-" + formatNum(record.employment_insurance) + "원", y, left);
  y += 6;
  addRow(doc, "공제합계", "-" + formatNum(record.total_deduction) + "원", y, left);
  y += 8;

  // 실수령액
  doc.setLineWidth(0.3);
  doc.line(left, y, right, y);
  y += 8;
  doc.setFontSize(12);
  doc.text("실수령액: " + formatNum(record.net_pay) + "원", 105, y, { align: "center" });
  y += 10;
  doc.line(left, y, right, y);
  y += 15;

  // 서명
  doc.setFontSize(10);
  doc.text("위 내용을 확인하고 동의합니다.", 105, y, { align: "center" });
  y += 8;

  if (record.signed_at) {
    doc.text(`서명일: ${new Date(record.signed_at).toLocaleDateString("ko-KR")}`, 105, y, { align: "center" });
    y += 8;
  }

  doc.text("서명:", left, y);

  // 하단 안내
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text("본 계약서는 Humend HR 플랫폼에서 전자서명으로 생성되었습니다.", 105, 280, { align: "center" });

  return doc;
}

function addSection(doc: jsPDF, title: string, y: number, x: number) {
  doc.setFontSize(11);
  doc.text(title, x, y);
  doc.setFontSize(10);
}

function addRow(doc: jsPDF, label: string, value: string, y: number, x: number) {
  doc.setTextColor(100);
  doc.text(label, x + 5, y);
  doc.setTextColor(0);
  doc.text(value, x + 70, y);
}

function formatNum(n: number) {
  return n.toLocaleString("ko-KR");
}
