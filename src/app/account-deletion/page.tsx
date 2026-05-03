import { Metadata } from "next";

export const metadata: Metadata = {
  title: "계정 삭제 안내 | 휴멘드 HR",
  description: "휴멘드 HR 회원 계정 및 데이터 삭제 요청 안내",
};

export default function AccountDeletionPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold">휴멘드 HR 계정 삭제 안내</h1>
      <p className="mt-2 text-sm text-muted-foreground">앱: 휴멘드 HR (com.humend.hr) · 개발자: Humend</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">1. 앱 내에서 직접 삭제 (가장 빠름)</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>휴멘드 HR 앱 실행 후 로그인</li>
            <li>하단 메뉴 "마이" 또는 우측 상단 프로필 클릭</li>
            <li>"설정" 또는 "내 정보" 진입</li>
            <li>"회원 탈퇴" 버튼 클릭</li>
            <li>비밀번호 확인 후 탈퇴 완료</li>
          </ol>
          <p className="mt-2">탈퇴 즉시 계정과 관련 데이터가 영구 삭제됩니다.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">2. 이메일로 삭제 요청</h2>
          <p>앱 접속이 어려운 경우 아래 이메일로 요청해주세요.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>이메일: <a className="underline" href="mailto:support@humendhr.com">support@humendhr.com</a></li>
            <li>제목: [계정 삭제 요청] 휴멘드 HR</li>
            <li>본문: 가입 시 사용한 전화번호와 이름</li>
            <li>처리 기간: 영업일 기준 3일 이내</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">3. 삭제되는 데이터</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>회원 정보 (이름, 전화번호, 이메일, 생년월일, 주소)</li>
            <li>프로필 사진</li>
            <li>지원 내역</li>
            <li>위치 정보 (이미 90일 자동 삭제)</li>
            <li>FCM 푸시 토큰</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">4. 보관되는 데이터 (법적 의무)</h2>
          <p>다음 항목은 관련 법령에 따라 일정 기간 보관됩니다.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>근로 계약서 및 급여 지급 기록 — 5년 (근로기준법 제42조, 소득세법)</li>
            <li>전자 서명 기록 — 3년 (전자문서법)</li>
            <li>거래 관련 분쟁 처리 기록 — 3년 (전자상거래법)</li>
          </ul>
          <p className="mt-2">위 보관 기간 경과 후 자동 파기됩니다.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">문의</h2>
          <p>이메일: <a className="underline" href="mailto:support@humendhr.com">support@humendhr.com</a></p>
          <p>웹사이트: <a className="underline" href="https://humendhr.com">https://humendhr.com</a></p>
        </section>
      </div>
    </main>
  );
}
