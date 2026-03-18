import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NativeAppProvider from "@/components/layout/NativeAppProvider";
import AppShell from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://humendhr.com"),
  title: "Humend HR",
  description: "Humend HR 플랫폼 - 인사관리 시스템",
  other: {
    "theme-color": "#FFFFFF",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes splash-slide{0%{transform:translateX(-100%)}50%{transform:translateX(150%)}100%{transform:translateX(350%)}}
          #splash{position:fixed;inset:0;background:#fff;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;transition:opacity .4s ease}
          #splash-bar{width:120px;height:3px;background:#e5e7eb;border-radius:2px;overflow:hidden}
          #splash-bar::after{content:'';display:block;width:40%;height:100%;background:#3b82f6;border-radius:2px;animation:splash-slide 1.2s ease-in-out infinite}
          body.loaded #splash{opacity:0;pointer-events:none}
        `}} />
        <div id="splash">
          <img src="/logo.png" alt="HUMAN:D" style={{height:'24px',width:'auto'}} />
          <div id="splash-bar" />
        </div>
        <NativeAppProvider>
          <TooltipProvider>
            <AppShell>{children}</AppShell>
            <Toaster position="top-center" richColors />
          </TooltipProvider>
        </NativeAppProvider>
      </body>
    </html>
  );
}
