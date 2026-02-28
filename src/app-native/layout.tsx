import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import NativeAppProvider from "@/components/layout/NativeAppProvider";
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
            <Header />
            <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
            <div className="text-[80%]">
              <Footer />
            </div>
            <Toaster position="top-center" richColors />
          </TooltipProvider>
        </NativeAppProvider>
      </body>
    </html>
  );
}
