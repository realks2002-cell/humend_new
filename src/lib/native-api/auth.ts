/**
 * Capacitor 네이티브 앱 전용 — 클라이언트 사이드 인증
 */
import { createClient } from "@/lib/supabase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

function phoneToEmail(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");
  return `${cleaned}@member.humend.hr`;
}

export async function memberLogin(phone: string, password: string) {
  if (!phone || !password) {
    return { error: "전화번호와 비밀번호를 입력해주세요." };
  }

  const supabase = createClient();
  const email = phoneToEmail(phone);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "전화번호 또는 비밀번호가 올바르지 않습니다." };
  }

  return { success: true };
}

export async function memberSignup(phone: string, name: string, password: string) {
  try {
    const res = await fetch(`${API_BASE}/api/native/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, name, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return { error: data?.error || `서버 오류 (${res.status})` };
    }
    return res.json();
  } catch {
    return { error: "네트워크 오류가 발생했습니다. 다시 시도해주세요." };
  }
}

export async function createGoogleMember(phone: string, name: string) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return { error: "인증 정보가 없습니다." };

  try {
    const res = await fetch(`${API_BASE}/api/native/auth/create-google-member`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ phone, name }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return { error: data?.error || `서버 오류 (${res.status})` };
    }
    return res.json();
  } catch {
    return { error: "네트워크 오류가 발생했습니다. 다시 시도해주세요." };
  }
}

export async function resetPasswordByEmail(email: string) {
  try {
    const res = await fetch(`${API_BASE}/api/native/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return { error: data?.error || `서버 오류 (${res.status})` };
    }
    return res.json();
  } catch {
    return { error: "네트워크 오류가 발생했습니다. 다시 시도해주세요." };
  }
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export async function getUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
