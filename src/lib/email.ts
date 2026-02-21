import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendTempPasswordEmail({
  to,
  memberName,
  tempPassword,
}: {
  to: string;
  memberName: string;
  tempPassword: string;
}) {
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "Humend HR <onboarding@resend.dev>",
    to,
    subject: "[Humend HR] 임시 비밀번호 안내",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden">
          <tr>
            <td style="background-color:#16a34a;padding:24px 32px">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700">Humend HR</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px">
              <p style="margin:0 0 8px;font-size:16px;color:#18181b">
                안녕하세요, <strong>${memberName}</strong>님
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#71717a">
                요청하신 임시 비밀번호를 안내드립니다.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#f0fdf4;border:2px solid #bbf7d0;border-radius:8px;padding:20px;text-align:center">
                    <p style="margin:0 0 8px;font-size:13px;color:#16a34a;font-weight:600">임시 비밀번호</p>
                    <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:0.3em;color:#15803d">${tempPassword}</p>
                  </td>
                </tr>
              </table>
              <div style="margin-top:24px;padding:16px;background-color:#fefce8;border-radius:8px;border:1px solid #fef08a">
                <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#a16207">보안 안내</p>
                <ul style="margin:8px 0 0;padding-left:18px;font-size:13px;color:#a16207;line-height:1.6">
                  <li>로그인 후 반드시 비밀번호를 변경해주세요.</li>
                  <li>임시 비밀번호는 타인에게 공유하지 마세요.</li>
                </ul>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;text-align:center">
              <p style="margin:0;font-size:12px;color:#a1a1aa">
                본 메일은 발신 전용입니다. 문의사항은 관리자에게 연락해주세요.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });

  if (error) {
    console.error("[sendTempPasswordEmail] error:", error);
    throw new Error("이메일 발송에 실패했습니다.");
  }
}
