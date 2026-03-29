import { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관 | 휴멘드 에이치알",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold">이용약관</h1>
      <p className="mt-2 text-sm text-muted-foreground">시행일: 2025년 1월 1일</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">제1조 (목적)</h2>
          <p>이 약관은 휴멘드 에이치알(이하 &ldquo;회사&rdquo;)이 운영하는 인력파견 플랫폼 서비스(이하 &ldquo;서비스&rdquo;)의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">제2조 (정의)</h2>
          <ul className="list-decimal space-y-1 pl-5">
            <li>&ldquo;서비스&rdquo;란 회사가 제공하는 인력파견 매칭 플랫폼 및 관련 서비스를 말합니다.</li>
            <li>&ldquo;이용자&rdquo;란 이 약관에 따라 서비스를 이용하는 회원을 말합니다.</li>
            <li>&ldquo;회원&rdquo;이란 회사에 개인정보를 제공하고 회원등록을 한 자로서, 서비스를 이용할 수 있는 자를 말합니다.</li>
            <li>&ldquo;고객사&rdquo;란 회사를 통해 인력을 파견받는 업체를 말합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">제3조 (약관의 효력 및 변경)</h2>
          <ul className="list-decimal space-y-1 pl-5">
            <li>이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
            <li>회사는 합리적인 사유가 발생할 경우 관련 법령에 위배되지 않는 범위에서 약관을 변경할 수 있으며, 변경된 약관은 적용일자 7일 전부터 공지합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">제4조 (이용계약의 체결)</h2>
          <ul className="list-decimal space-y-1 pl-5">
            <li>이용계약은 이용자가 약관에 동의하고 회원가입을 신청한 후, 회사가 이를 승낙함으로써 체결됩니다.</li>
            <li>회사는 다음 각 호에 해당하는 경우 회원가입을 거절하거나 사후에 이용계약을 해지할 수 있습니다.
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>타인의 정보를 도용한 경우</li>
                <li>허위 정보를 기재한 경우</li>
                <li>기타 회사가 정한 이용 요건에 부합하지 않는 경우</li>
              </ul>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">제5조 (서비스의 내용)</h2>
          <p>회사가 제공하는 서비스는 다음과 같습니다.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>인력파견 채용공고 등록 및 검색</li>
            <li>일자리 지원 및 매칭</li>
            <li>이력서 등록 및 관리</li>
            <li>근무내역 및 급여 관리</li>
            <li>근로계약서 전자서명</li>
            <li>출근 확인 (위치정보 동의 시)</li>
            <li>기타 회사가 추가 개발하거나 제휴를 통해 제공하는 서비스</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">제6조 (서비스의 변경 및 중단)</h2>
          <ul className="list-decimal space-y-1 pl-5">
            <li>회사는 운영상, 기술상의 필요에 따라 서비스의 전부 또는 일부를 변경할 수 있습니다.</li>
            <li>서비스 변경 시 변경 내용과 적용일자를 사전에 공지합니다.</li>
            <li>회사는 천재지변, 시스템 장애 등 불가항력적인 사유가 발생한 경우 서비스 제공을 일시적으로 중단할 수 있습니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">제7조 (회원의 의무)</h2>
          <ul className="list-decimal space-y-1 pl-5">
            <li>회원은 정확한 정보를 제공해야 하며, 변경사항이 있을 경우 즉시 수정해야 합니다.</li>
            <li>회원은 본인의 계정 정보를 타인에게 양도하거나 대여할 수 없습니다.</li>
            <li>회원은 서비스 이용 시 관련 법령, 이 약관, 이용안내 등을 준수해야 합니다.</li>
            <li>회원은 배정된 근무에 성실히 임해야 하며, 무단 불참 시 서비스 이용에 제한을 받을 수 있습니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">제8조 (회사의 의무)</h2>
          <ul className="list-decimal space-y-1 pl-5">
            <li>회사는 관련 법령과 이 약관이 금지하는 행위를 하지 않으며, 지속적이고 안정적인 서비스를 제공하기 위해 노력합니다.</li>
            <li>회사는 이용자의 개인정보 보호를 위해 개인정보처리방침을 수립하고 이를 준수합니다.</li>
            <li>회사는 정당한 급여가 적시에 지급될 수 있도록 노력합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">제9조 (위치정보의 수집 및 이용)</h2>
          <ul className="list-decimal space-y-1 pl-5">
            <li>회사는 출근 확인 서비스를 위해 회원의 위치정보를 수집·이용합니다.</li>
            <li>위치정보의 수집 목적: 배정된 근무일에 근무지 접근 시 도착 여부 확인 (지오펜싱 기반). 위치는 지속적으로 수집되지 않습니다.</li>
            <li>수집 항목: GPS 좌표, 수집 시점</li>
            <li>보관 기간: 수집일로부터 90일 후 자동 삭제</li>
            <li>회원은 서비스 내 위치정보 수집 동의 관리 페이지에서 언제든지 동의를 철회할 수 있습니다.</li>
            <li>동의 철회 시 위치 기반 출석체크 서비스를 이용할 수 없습니다.</li>
            <li>수집된 위치정보는 제3자에게 제공되지 않습니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">제10조 (푸시 알림)</h2>
          <ul className="list-decimal space-y-1 pl-5">
            <li>회사는 서비스 운영에 필요한 알림을 푸시 알림으로 발송할 수 있습니다.</li>
            <li>푸시 알림의 종류: 근무 배정 안내, 출근 확인 요청, 급여 확정 안내, 노쇼 처리 안내 등</li>
            <li>회원은 기기 설정에서 푸시 알림 수신을 거부할 수 있으며, 거부 시 출근 확인 알림을 받을 수 없어 노쇼로 처리될 수 있습니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">제11조 (카메라 및 사진 접근)</h2>
          <ul className="list-decimal space-y-1 pl-5">
            <li>회사는 프로필 사진 등록을 위해 카메라 및 사진 라이브러리 접근 권한을 요청할 수 있습니다.</li>
            <li>촬영 또는 선택된 사진은 프로필 사진 용도로만 사용되며, 회원 탈퇴 시 삭제됩니다.</li>
            <li>회원은 기기 설정에서 카메라 권한을 언제든지 해제할 수 있습니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">제12조 (계정 삭제 및 데이터 처리)</h2>
          <ul className="list-decimal space-y-1 pl-5">
            <li>회원은 서비스 내 마이페이지에서 언제든지 회원 탈퇴를 요청할 수 있습니다.</li>
            <li>탈퇴 시 회원의 개인정보, 지원내역, 근무내역, 급여내역, 위치정보가 영구적으로 삭제되며 복구할 수 없습니다.</li>
            <li>단, 관련 법령에 의해 보존이 필요한 정보는 해당 기간 동안 보관 후 파기합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">제13조 (계약 해지 및 이용 제한)</h2>
          <ul className="list-decimal space-y-1 pl-5">
            <li>회원은 언제든지 서비스 내에서 탈퇴를 요청할 수 있으며, 회사는 즉시 처리합니다.</li>
            <li>회사는 회원이 다음 각 호에 해당하는 경우 서비스 이용을 제한하거나 이용계약을 해지할 수 있습니다.
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>약관을 위반한 경우</li>
                <li>서비스 운영을 방해한 경우</li>
                <li>타인의 명예를 손상시키거나 불이익을 준 경우</li>
                <li>정당한 사유 없이 반복적으로 근무에 불참한 경우</li>
              </ul>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">제14조 (면책조항)</h2>
          <ul className="list-decimal space-y-1 pl-5">
            <li>회사는 천재지변 또는 이에 준하는 불가항력으로 인해 서비스를 제공할 수 없는 경우에는 책임이 면제됩니다.</li>
            <li>회사는 이용자의 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.</li>
            <li>회사는 이용자가 서비스를 통해 얻은 정보로 인한 손해에 대해 책임을 지지 않습니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">제15조 (분쟁 해결)</h2>
          <ul className="list-decimal space-y-1 pl-5">
            <li>서비스 이용과 관련하여 분쟁이 발생한 경우 회사와 이용자는 상호 협의하여 해결합니다.</li>
            <li>협의가 이루어지지 않을 경우 관할 법원은 회사 소재지를 관할하는 법원으로 합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">부칙</h2>
          <p>이 약관은 2025년 1월 1일부터 시행합니다.</p>
        </section>
      </div>
    </main>
  );
}
