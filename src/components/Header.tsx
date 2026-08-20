"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";

export default function Header() {
  const pathname = usePathname();
  const { user, loading, openLoginModal, signOut } = useAuth();

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "사용자";

  return (
    <header className="flex items-center justify-between border-b border-black/10 pb-6">
      <div className="flex items-center gap-6">
        <Link className="text-lg font-bold tracking-[-0.06em] text-[#171918]" href="/">
          RE:TRACK
        </Link>
        <nav className="hidden sm:flex items-center gap-5 text-sm font-medium">
          <Link
            className={`transition ${
              pathname === "/changes" ? "font-semibold text-[#e6523a]" : "text-[#444] hover:text-[#171918]"
            }`}
            href="/changes"
          >
            변화 피드
          </Link>
          <Link
            className={`transition ${
              pathname === "/my" ? "font-semibold text-[#e6523a]" : "text-[#444] hover:text-[#171918]"
            }`}
            href="/my"
          >
            내 관심 사업장
          </Link>
          <Link
            className={`transition ${
              pathname === "/pricing" ? "font-semibold text-[#e6523a]" : "text-[#444] hover:text-[#171918]"
            }`}
            href="/pricing"
          >
            요금제
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-2.5">
        <Link
          href="/pricing"
          className="hidden sm:flex items-center gap-1 rounded-xl bg-amber-50 border border-amber-200/80 px-2.5 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
        >
          <span>👑</span>
          <span>Pro 혜택</span>
        </Link>

        {loading ? (
          <div className="h-8 w-16 animate-pulse rounded-lg bg-black/5" />
        ) : user ? (
          <div className="flex items-center gap-2">
            <Link
              href="/my"
              className="flex items-center gap-2 rounded-xl border border-black/8 bg-white px-3 py-1.5 text-xs font-semibold text-[#171918] transition hover:bg-[#f7f7f4]"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{displayName}</span>
            </Link>
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-lg px-2.5 py-1 text-xs text-[#777a76] hover:bg-black/5 hover:text-black"
            >
              로그아웃
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openLoginModal(pathname)}
            className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#171918] shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition hover:bg-[#f7f7f4] active:scale-[0.98]"
          >
            <span>로그인 / 시작하기</span>
          </button>
        )}
      </div>
    </header>
  );
}
