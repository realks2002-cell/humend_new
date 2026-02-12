import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-8xl font-bold text-muted-foreground/20">404</p>
      <h1 className="mt-4 text-2xl font-bold">페이지를 찾을 수 없습니다</h1>
      <p className="mt-2 text-muted-foreground">
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/">
          <Button>
            <Home className="mr-2 h-4 w-4" />
            홈으로
          </Button>
        </Link>
        <Link href="/jobs">
          <Button variant="outline">
            채용공고 보기
          </Button>
        </Link>
      </div>
    </div>
  );
}
