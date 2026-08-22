"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";

export default function LoginModal() {
  const { isLoginModalOpen, closeLoginModal, signInWithKakao, signInWithGoogle, signInAsDemoUser, loginRedirectUrl } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleKakaoLogin = () => {
    setError(null);
    signInWithKakao(loginRedirectUrl).catch((err) => {
      setError(err instanceof Error ? err.message : "카카오 로그인에 실패했습니다.");
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isLoginModalOpen) {
        closeLoginModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoginModalOpen, closeLoginModal]);

  if (!isLoginModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={closeLoginModal}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-[0.12em] text-[#e6523a]">RE:TRACK ACCOUNT</span>
          <button
            type="button"
            onClick={closeLoginModal}
            className="rounded-full p-1 text-[#777a76] hover:bg-black/5 hover:text-black cursor-pointer"
            aria-label="닫기"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#171918]">간편 로그인</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#6e716e]">
          관심 있는 정비사업장을 등록하고 조합원 자격 판정기 & 편입 지번 조서를 무료로 이용하세요.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          {/* Kakao Login Button */}
          <button
            type="button"
            onClick={handleKakaoLogin}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-[#FEE500] font-semibold text-[#191919] transition hover:brightness-95 active:scale-[0.99] cursor-pointer shadow-xs"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.477 3 2 6.477 2 10.771c0 2.808 1.88 5.27 4.72 6.64l-1.2 4.414c-.106.39.34.7.675.474l5.226-3.468c.19.014.383.021.579.021 5.523 0 10-3.477 10-7.771S17.523 3 12 3z" />
            </svg>
            카카오로 3초 만에 시작하기
          </button>
          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>
          )}

          {/* Google Login Button */}
          <button
            type="button"
            onClick={() => signInWithGoogle(loginRedirectUrl)}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-black/10 bg-white font-semibold text-[#374151] transition hover:bg-[#f9f9f9] active:scale-[0.99] cursor-pointer shadow-xs"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.26 21.36 7.36 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            Google 계정으로 계속하기
          </button>

          {/* Instant Demo Login Button */}
          <button
            type="button"
            onClick={() => signInAsDemoUser("테스트 조합원")}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-400 bg-emerald-50/70 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 active:scale-[0.99] cursor-pointer mt-1"
          >
            <span>⚡</span>
            <span>1초 원클릭 체험 로그인 (비회원 테스트용)</span>
          </button>
        </div>

        <p className="mt-5 text-center text-xs leading-relaxed text-[#989b96]">
          별도의 비밀번호 생성 없이 간편하게 인증되며, 관심 사업장 저장 및 알림 목적으로만 식별됩니다.
        </p>
      </div>
    </div>
  );
}
