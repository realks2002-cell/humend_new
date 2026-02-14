import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function GET() {
  const result: Record<string, string> = {};

  // 1. 환경변수 확인
  const base64Key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  result.BASE64_KEY = base64Key ? `있음 (${base64Key.length}자)` : "없음";
  result.SPREADSHEET_ID = spreadsheetId ?? "없음";
  result.OLD_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? "있음" : "없음";
  result.OLD_KEY = process.env.GOOGLE_PRIVATE_KEY ? `있음 (${process.env.GOOGLE_PRIVATE_KEY.length}자)` : "없음";

  if (!base64Key) {
    return NextResponse.json({ ...result, error: "GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 없음" });
  }
  if (!spreadsheetId) {
    return NextResponse.json({ ...result, error: "GOOGLE_SPREADSHEET_ID 없음" });
  }

  // 2. Base64 디코딩 테스트
  try {
    const creds = JSON.parse(Buffer.from(base64Key, "base64").toString("utf8"));
    result.DECODED_EMAIL = creds.client_email;
    result.DECODED_KEY_START = creds.private_key?.substring(0, 30) ?? "없음";

    // 3. Google Sheets API 호출
    const auth = new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });
    const { data } = await sheets.spreadsheets.get({ spreadsheetId });
    result.SHEET_TITLE = data.properties?.title ?? "알 수 없음";
    result.STATUS = "성공";
  } catch (e) {
    result.ERROR = (e as Error).message;
    result.STATUS = "실패";
  }

  return NextResponse.json(result);
}
