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
          href="https://cpcpfepft9rzl9lo.public.blob.vercel-storage.com/humend-hr-0Wiia4l4fUkqhxqfgFqhQ15F8B8gAn.apk"
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
          <ol className="space-y-3 text-xs leading-relaxed text-gray-600">
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
              <span>
                &ldquo;이 출처의 앱 설치가 허용되지 않습니다&rdquo; 팝업이 나오면
                <strong className="text-gray-900"> &ldquo;설정&rdquo;</strong>을 탭합니다.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 font-bold text-[#830020]">4.</span>
              <span>
                <strong className="text-gray-900">&ldquo;이 출처 허용&rdquo;</strong> 토글을 켭니다.
                (브라우저별 1회만 설정하면 이후에는 안 나옵니다)
              </span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 font-bold text-[#830020]">5.</span>
              뒤로 가기를 누르면 설치가 진행됩니다.
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 font-bold text-[#830020]">6.</span>
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
