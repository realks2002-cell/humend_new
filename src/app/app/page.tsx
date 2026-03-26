import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "HUMAN:D 앱 다운로드",
  description: "휴멘드 HR 앱을 다운로드하세요.",
};

export default function AppDownloadPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white to-gray-50 px-6 py-12">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* Logo */}
        <div>
          <Image
            src="/logo.png"
            alt="HUMAN:D"
            width={160}
            height={40}
            className="mx-auto h-6 w-auto"
          />
          <p className="mt-3 text-sm text-gray-500">인력파견 매칭 플랫폼</p>
        </div>

        {/* Download Button */}
        <a
          href="/humend-hr.apk"
          download
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#830020] px-6 py-4 text-base font-bold text-white shadow-lg transition-all active:scale-[0.98]"
        >
          Android 앱 다운로드
        </a>

        {/* Version Info */}
        <p className="text-xs text-gray-400">v1.0.0 (테스트 빌드)</p>

        {/* Install Guide */}
        <div className="rounded-xl border bg-white p-5 text-left shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-gray-900">설치 방법</h2>
          <ol className="space-y-2 text-xs leading-relaxed text-gray-600">
            <li className="flex gap-2">
              <span className="shrink-0 font-bold text-[#830020]">1.</span>
              위 버튼을 눌러 APK 파일을 다운로드합니다.
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 font-bold text-[#830020]">2.</span>
              다운로드 완료 알림을 누르거나, 파일 관리자에서 APK를 찾아 실행합니다.
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 font-bold text-[#830020]">3.</span>
              &ldquo;출처를 알 수 없는 앱&rdquo; 설치를 허용하라는 안내가 나오면 &ldquo;설정&rdquo;을 눌러 허용합니다.
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 font-bold text-[#830020]">4.</span>
              설치가 완료되면 앱을 실행합니다.
            </li>
          </ol>
        </div>

        {/* Back to Web */}
        <Link
          href="/"
          className="inline-block text-sm text-gray-400 underline underline-offset-4"
        >
          웹으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
