"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WebChatPage() {
  const router = useRouter();

  useEffect(() => {
    // 웹에서는 로그인 페이지로 리다이렉트 (앱 전용 기능)
    router.replace("/login");
  }, [router]);

  return null;
}
