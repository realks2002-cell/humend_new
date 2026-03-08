import { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 휴멘드 에이치알",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold">개인정보처리방침</h1>
      <p className="mt-2 text-sm text-muted-foreground">시행일: 2025년 1월 1일</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">1. 개인정보의 수집 항목 및 수집 방법</h2>
          <p>회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>필수항목:</strong> 이름, 생년월일, 성별, 연락처(휴대전화번호), 주소, 은행계좌정보</li>
            <li><strong>선택항목:</strong> 프로필 사진, 경력사항, 자격증 정보</li>
            <li><strong>자동 수집:</strong> 접속 IP, 접속 일시, 서비스 이용 기록, 기기 정보</li>
            <li><strong>위치정보:</strong> 출근 확인을 위한 위치정보 (동의 시에만 수집)</li>
          </ul>
          <p className="mt-2">수집 방법: 회원가입, 서비스 이용, 고객센터 문의</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">2. 개인정보의 수집 및 이용 목적</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>회원 가입 및 관리: 본인 확인, 서비스 부정이용 방지</li>
            <li>인력파견 서비스 제공: 채용공고 매칭, 지원 처리, 근무 배정</li>
            <li>급여 정산: 근무내역 기반 급여 계산 및 지급</li>
            <li>계약 관리: 근로계약서 작성 및 전자서명</li>
            <li>출근 확인: 위치정보 기반 출근 여부 확인 (동의 시)</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">3. 개인정보의 보유 및 이용 기간</h2>
          <p>회원 탈퇴 시 지체 없이 파기합니다. 단, 관련 법령에 의해 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
            <li>대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)</li>
            <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)</li>
            <li>근로계약 관련 기록: 3년 (근로기준법)</li>
            <li>임금대장: 3년 (근로기준법)</li>
            <li>위치정보: 90일 후 자동 삭제</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">4. 개인정보의 제3자 제공</h2>
          <p>회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>이용자가 사전에 동의한 경우</li>
            <li>인력파견 서비스 이행을 위해 파견처(고객사)에 성명, 연락처 등 최소한의 정보를 제공하는 경우</li>
            <li>법령의 규정에 의하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">5. 개인정보의 파기 절차 및 방법</h2>
          <p>보유 기간이 경과하거나 처리 목적이 달성된 경우 지체 없이 해당 개인정보를 파기합니다.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>전자적 파일: 복구 불가능한 방법으로 영구 삭제</li>
            <li>종이 문서: 분쇄기로 분쇄하거나 소각</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">6. 이용자의 권리 및 행사 방법</h2>
          <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>개인정보 열람 요구</li>
            <li>오류 등이 있을 경우 정정 요구</li>
            <li>삭제 요구</li>
            <li>처리 정지 요구</li>
          </ul>
          <p className="mt-2">권리 행사는 서면, 전화, 이메일 등을 통하여 하실 수 있으며, 회사는 지체 없이 조치하겠습니다.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">7. 개인정보의 안전성 확보 조치</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>개인정보의 암호화</li>
            <li>해킹 등에 대비한 기술적 대책</li>
            <li>개인정보 접근 제한</li>
            <li>접속기록의 보관 및 위·변조 방지</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">8. 개인정보 보호책임자</h2>
          <ul className="space-y-1">
            <li><strong>회사명:</strong> 휴멘드 에이치알</li>
            <li><strong>주소:</strong> 서울특별시 구로구 디지털로34번길 55</li>
            <li><strong>연락처:</strong> 02-875-8332</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">9. 개인정보처리방침의 변경</h2>
          <p>이 개인정보처리방침은 법령, 정책 또는 보안기술의 변경에 따라 내용의 추가, 삭제 및 수정이 있을 수 있으며, 변경 시 웹사이트를 통해 공지합니다.</p>
        </section>
      </div>
    </main>
  );
}
