import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t bg-muted/40" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-col gap-6 md:flex-row md:justify-between">
          <div>
            <p className="text-sm font-bold">Humend</p>
            <p className="mt-1 text-xs text-muted-foreground">
              인력 매칭 플랫폼
            </p>
          </div>
          <nav className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/about" className="hover:text-foreground">
              사업소개
            </Link>
            <Link href="/jobs" className="hover:text-foreground">
              채용공고
            </Link>
          </nav>
        </div>
        <div className="mt-6 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            &copy; 2026 Humend. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
