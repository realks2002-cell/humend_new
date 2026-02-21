import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t bg-muted/40" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-col gap-6 md:flex-row md:justify-between">
          <div>
            <p className="text-base font-bold">휴멘드 에이치알</p>
            <p className="mt-1 text-sm text-muted-foreground">
              인력 매칭 플랫폼
            </p>
            <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
              <p>서울특별시 구로구 디지털로34번길 55, 비201-비2(구로동, 코오롱 싸이언스밸리2차)</p>
              <p>Tel. 02-875-8332 | 사업자등록번호 396-87-03869</p>
            </div>
          </div>
          <nav className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/about" className="hover:text-foreground">
              사업소개
            </Link>
            <Link href="/jobs" className="hover:text-foreground">
              채용공고
            </Link>
          </nav>
        </div>
        <div className="mt-6 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            &copy; 2026 휴멘드 에이치알. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
