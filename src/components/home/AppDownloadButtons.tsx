"use client";

import { useEffect, useState } from "react";
import { isNative } from "@/lib/capacitor/native";

const APP_STORE_URL = "https://apps.apple.com/kr/app/id6761329910";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.humend.hr";

export default function AppDownloadButtons() {
  const [hide, setHide] = useState(false);

  useEffect(() => {
    if (isNative()) setHide(true);
  }, []);

  if (hide) return null;

  return (
    <section className="bg-white px-6 py-2.5 my-8">
      <h3 className="text-lg font-extrabold text-hd-primary my-[10pt]">
        휴멘드앱을 설치하고 편하게 일하세요!
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {/* Google Play — 4-color brand logo + white bg */}
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl bg-white border border-gray-200 px-2 py-3 active:scale-95 transition-transform shadow-sm"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path fill="#4285F4" d="M3 20.5V3.5c0-.59.34-1.11.84-1.35L13.69 12 3.84 21.85c-.5-.25-.84-.76-.84-1.35z" />
            <path fill="#EA4335" d="M16.81 15.12L6.05 21.34l8.49-8.5 2.27 2.28z" />
            <path fill="#FBBC04" d="M20.16 10.81c.75.43.75 1.61 0 2.04l-2.93 1.68-3.5-3.5 3.5-3.51 2.93 1.29z" />
            <path fill="#34A853" d="M6.05 2.66L16.81 8.88l-2.27 2.28L6.05 2.66z" />
          </svg>
          <div className="text-left">
            <div className="text-[9px] text-gray-500 leading-tight">GET IT ON</div>
            <div className="font-bold text-[13px] text-gray-900 leading-tight">Google Play</div>
          </div>
        </a>

        {/* App Store — black bg + white Apple logo */}
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl bg-black px-2 py-3 active:scale-95 transition-transform shadow-sm"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
          </svg>
          <div className="text-left">
            <div className="text-[9px] text-white/70 leading-tight">Download on the</div>
            <div className="font-bold text-[13px] text-white leading-tight">App Store</div>
          </div>
        </a>
      </div>
    </section>
  );
}
