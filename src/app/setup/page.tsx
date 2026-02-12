"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function SetupPage() {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    setResult("생성 중...");

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 1. 관리자 계정 생성
    const { data, error } = await supabase.auth.signUp({
      email: "admin@admin.humend.hr",
      password: "admin123",
      options: {
        data: { name: "관리자", role: "admin" },
      },
    });

    if (error) {
      setResult(`Auth 에러: ${error.message}`);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setResult("유저 생성 실패");
      setLoading(false);
      return;
    }

    // 2. admins 테이블에 등록
    const { error: adminError } = await supabase.from("admins").insert({
      id: data.user.id,
      email: "admin@admin.humend.hr",
      name: "관리자",
    });

    if (adminError) {
      setResult(`admins 테이블 에러: ${adminError.message} (Auth 유저는 생성됨 - 로그인 시도해보세요)`);
    } else {
      setResult(`관리자 생성 완료! ID: ${data.user.id}\n아이디: admin / 비밀번호: admin123`);
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 40, maxWidth: 500, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold" }}>관리자 초기 설정</h1>
      <p style={{ marginTop: 8, color: "#666" }}>admin / admin123 계정을 생성합니다.</p>
      <button
        onClick={handleSetup}
        disabled={loading}
        style={{
          marginTop: 20, padding: "10px 24px",
          background: "#000", color: "#fff", border: "none",
          borderRadius: 8, cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "생성 중..." : "관리자 계정 생성"}
      </button>
      {result && (
        <pre style={{ marginTop: 20, padding: 16, background: "#f5f5f5", borderRadius: 8, whiteSpace: "pre-wrap" }}>
          {result}
        </pre>
      )}
    </div>
  );
}
