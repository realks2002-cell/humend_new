import { google } from "googleapis";
import fs from "fs";
import path from "path";

function getAuth() {
  // 1) 환경변수 우선 (Vercel 등 서버리스 환경)
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;

  if (email && rawKey) {
    // Vercel 환경변수 포맷 대응: 따옴표 제거 + 줄바꿈 정규화
    const key = rawKey
      .replace(/^["']|["']$/g, "")   // 앞뒤 따옴표 제거
      .replace(/\\\\n/g, "\n")        // \\n (이중 이스케이프)
      .replace(/\\n/g, "\n");         // \n (단일 이스케이프)
    return new google.auth.JWT({
      email,
      key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
  }

  // 2) JSON 키 파일 fallback (로컬 개발)
  const keyFilePath = path.join(process.cwd(), "humend-293c16164287.json");
  if (fs.existsSync(keyFilePath)) {
    const creds = JSON.parse(fs.readFileSync(keyFilePath, "utf8"));
    return new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
  }

  throw new Error("Google Service Account 설정이 없습니다. 환경변수 또는 JSON 키 파일을 확인하세요.");
}

function getSheets() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

function getSpreadsheetId() {
  const id = process.env.GOOGLE_SPREADSHEET_ID;
  if (!id) throw new Error("GOOGLE_SPREADSHEET_ID가 설정되지 않았습니다.");
  return id;
}

/**
 * 급여 데이터를 Google Sheets로 내보내기
 */
export async function exportToSheets(
  sheetName: string,
  headers: string[],
  rows: (string | number)[][]
) {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  // 시트 존재 여부 확인 / 생성
  const { data: spreadsheet } = await sheets.spreadsheets.get({ spreadsheetId });
  const allSheets = spreadsheet.sheets ?? [];
  const existing = allSheets.find(
    (s) => s.properties?.title === sheetName
  );

  // 현재 탭 외 다른 탭 모두 삭제 (최소 1개 시트는 남아야 하므로 현재 탭 먼저 생성)
  if (!existing) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      },
    });
  }

  // 다른 탭 삭제
  const otherSheets = allSheets.filter(
    (s) => s.properties?.title !== sheetName
  );
  if (otherSheets.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: otherSheets.map((s) => ({
          deleteSheet: { sheetId: s.properties?.sheetId },
        })),
      },
    });
  }

  // 시트 ID 가져오기 (보호 설정에 필요)
  const { data: updatedSpreadsheet } = await sheets.spreadsheets.get({ spreadsheetId });
  const targetSheet = updatedSpreadsheet.sheets?.find(
    (s) => s.properties?.title === sheetName
  );
  const sheetId = targetSheet?.properties?.sheetId ?? 0;

  // 기존 데이터 전체 삭제 후 새로 쓰기
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sheetName}!A1:AZ10000`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [headers, ...rows],
    },
  });

  return { success: true, sheetName, sheetId };
}

/**
 * 특정 컬럼들을 편집 보호 설정
 */
export async function protectColumns(
  sheetId: number,
  columns: number[],
  rowCount: number
) {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  // 기존 보호 범위 제거 (중복 방지)
  const { data: spreadsheet } = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties,protectedRanges)",
  });
  const targetSheet = spreadsheet.sheets?.find(
    (s) => s.properties?.sheetId === sheetId
  );
  const existingProtections = targetSheet?.protectedRanges ?? [];

  if (existingProtections.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: existingProtections.map((p) => ({
          deleteProtectedRange: { protectedRangeId: p.protectedRangeId! },
        })),
      },
    });
  }

  // 새 보호 범위 추가
  const requests = columns.map((col) => ({
    addProtectedRange: {
      protectedRange: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: rowCount + 1, // 헤더 포함
          startColumnIndex: col,
          endColumnIndex: col + 1,
        },
        description: "자동 잠금 (수정 불가)",
        warningOnly: true,
      },
    },
  }));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });
}

/**
 * Google Sheets에서 데이터 가져오기
 */
export async function importFromSheets(sheetName: string) {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:AZ1000`,
  });

  const rows = data.values ?? [];
  if (rows.length < 2) return { headers: [], data: [] };

  const headers = rows[0] as string[];
  const dataRows = rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (row[i] as string) ?? "";
    });
    return obj;
  });

  return { headers, data: dataRows };
}
