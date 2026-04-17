"use client";

import { useEffect } from "react";

export default function MyLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("android")) {
      document.body.classList.add("android");
    }
    return () => {
      document.body.classList.remove("android");
    };
  }, []);

  return <>{children}</>;
}
