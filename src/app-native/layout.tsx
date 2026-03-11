import "./globals.css";
import NativeAppProvider from "@/components/layout/NativeAppProvider";
import BottomNav from "@/components/layout/BottomNav";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#FFFFFF" />
        <title>Humend HR</title>
      </head>
      <body className="antialiased">
        <NativeAppProvider>
          <TooltipProvider>
            <main className="min-h-screen pb-16" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>{children}</main>
            <BottomNav />
            <Toaster position="top-center" richColors />
          </TooltipProvider>
        </NativeAppProvider>
      </body>
    </html>
  );
}
