"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { href: "/", label: "홈" },
  { href: "/jobs", label: "알바공고" },
  { href: "/about", label: "사업소개" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // 라우트 변경 시마다 인증 상태 재확인
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, [pathname]);

  // onAuthStateChange 리스너
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
    router.refresh();
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b bg-background/95 backdrop-blur transition-shadow supports-[backdrop-filter]:bg-background/60",
        scrolled && "shadow-sm"
      )}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          <span className="text-xl font-bold tracking-tight">Humend</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-10 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-normal text-black transition-colors hover:text-black"
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <div className="flex items-center gap-2">
              <Link href="/my">
                <Button variant="ghost" size="sm">
                  <User className="mr-1 h-4 w-4" />
                  마이페이지
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-1 h-4 w-4" />
                로그아웃
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button size="sm">로그인</Button>
              </Link>
              <Link href="/signup">
                <Button variant="outline" size="sm">회원가입</Button>
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile Hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">메뉴 열기</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <div className="flex items-center justify-between pb-4">
              <span className="text-xl font-bold tracking-tight">Humend</span>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm font-normal text-black transition-colors hover:bg-accent"
                >
                  {link.label}
                </Link>
              ))}
              <div className="my-2 border-t" />
              {user ? (
                <>
                  <Link
                    href="/my"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-normal text-black transition-colors hover:bg-accent"
                  >
                    <User className="h-4 w-4" />
                    마이페이지
                  </Link>
                  <button
                    onClick={() => { handleSignOut(); setOpen(false); }}
                    className="flex items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm font-normal text-red-600 transition-colors hover:bg-accent"
                  >
                    <LogOut className="h-4 w-4" />
                    로그아웃
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2 px-3 pt-2">
                  <Link href="/login" onClick={() => setOpen(false)}>
                    <Button className="w-full" size="sm">로그인</Button>
                  </Link>
                  <Link href="/signup" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full" size="sm">회원가입</Button>
                  </Link>
                </div>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
