import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import NativeAppProvider from "@/components/layout/NativeAppProvider";
import BottomNav from "@/components/layout/BottomNav";
import TermsAgreement from "@/components/layout/TermsAgreement";
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
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
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            function hide(){
              try{var C=window.Capacitor;if(C&&C.Plugins&&C.Plugins.SplashScreen)C.Plugins.SplashScreen.hide();}catch(e){}
              setTimeout(function(){document.body.classList.add('loaded');},500);
            }
            if(document.readyState==='complete')hide();
            else window.addEventListener('load',hide);
          })();
        `}} />
        <TooltipProvider>
          <TermsAgreement>
            <NativeAppProvider>
              <main className="min-h-screen pb-16 w-full max-w-full overflow-x-hidden" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>{children}</main>
              <BottomNav />
            </NativeAppProvider>
          </TermsAgreement>
          <Toaster position="top-center" richColors />
        </TooltipProvider>
      </body>
    </html>
  );
}
