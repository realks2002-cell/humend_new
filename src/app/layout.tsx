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
