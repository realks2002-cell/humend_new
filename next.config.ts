import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["iconv-lite"],
  // 알림톡 딥링크: https://humendhr.com/go/salary → 연결 페이지(route handler, 앱 정적 빌드에서는 api 폴더째 제외)
  async rewrites() {
    return [{ source: "/go/:target", destination: "/api/go/:target" }];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
