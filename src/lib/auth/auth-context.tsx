"use client";

import React, { createContext, useContext, useEffect, useState, useTransition } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

type KakaoProfileOverride = { id: string; email?: string; profileImage?: string };

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithKakao: (nextUrl?: string) => Promise<void>;
  signInWithGoogle: (nextUrl?: string) => Promise<void>;
  signInAsDemoUser: (name?: string, kakaoProfile?: KakaoProfileOverride) => void;
  signOut: () => Promise<void>;
  isLoginModalOpen: boolean;
  loginRedirectUrl: string;
  openLoginModal: (redirectUrl?: string) => void;
  closeLoginModal: () => void;
  kakaoLoginError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER: User = {
  id: "demo-user-1234",
  app_metadata: {},
  user_metadata: {
    full_name: "홍길동 (조합원)",
    name: "홍길동 (조합원)",
    email: "member@retrack.kr",
  },
  aud: "authenticated",
  created_at: new Date().toISOString(),
} as User;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginRedirectUrl, setLoginRedirectUrl] = useState("/");
  const [kakaoLoginError, setKakaoLoginError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    // 카카오 SDK를 미리 로드/초기화해 둔다. 로그인 버튼 클릭 시점에 스크립트를
    // 그때부터 불러오면(await 지연) 팝업 오픈이 "사용자 제스처" 컨텍스트를 벗어나
    // Safari 등에서 팝업 차단에 걸릴 수 있다.
    import("./kakao-sdk").then(({ loadKakaoSdk }) => loadKakaoSdk());
  }, []);

  useEffect(() => {
    // /auth/kakao/callback (route.ts)이 토큰 교환/프로필 조회까지 서버에서
    // 끝내고, 원래 페이지로 결과를 쿼리 파라미터에 실어 돌려보낸다. 여기서
    // 그 결과를 읽어 로컬 세션으로 반영하고 URL에서 흔적을 지운다.
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const profileParam = params.get("kakao_profile");
    const errorParam = params.get("kakao_error");
    if (!profileParam && !errorParam) return;

    if (profileParam) {
      try {
        // atob()는 base64를 바이트별 "binary string"으로만 디코딩할 뿐 UTF-8을
        // 모른다. 그대로 JSON.parse에 넘기면 닉네임의 한글이 깨진다. 바이트로
        // 되돌린 뒤 TextDecoder로 UTF-8 디코딩해야 한다.
        const bytes = Uint8Array.from(atob(profileParam), (c) => c.charCodeAt(0));
        const decoded = JSON.parse(new TextDecoder("utf-8").decode(bytes));
        signInAsDemoUser(`${decoded.nickname} (카카오)`, {
          id: `kakao_${decoded.id}`,
          email: decoded.email,
          profileImage: decoded.profileImage,
        });
      } catch (e) {
        console.error("카카오 로그인 결과 파싱 실패:", e);
        setKakaoLoginError("카카오 로그인 결과를 처리하지 못했습니다.");
        setIsLoginModalOpen(true);
      }
    } else if (errorParam) {
      setKakaoLoginError(
        errorParam === "not_configured"
          ? "카카오 로그인이 서버에 설정되지 않았습니다. (관리자: KAKAO_REST_API_KEY 확인)"
          : "카카오 로그인에 실패했습니다. 잠시 후 다시 시도하세요."
      );
      setIsLoginModalOpen(true);
    }

    params.delete("kakao_profile");
    params.delete("kakao_error");
    const cleanQuery = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (cleanQuery ? `?${cleanQuery}` : ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only, reads window.location directly
  }, []);

  useEffect(() => {
    // Check demo user in localStorage first
    if (typeof window !== "undefined") {
      const demoSession = localStorage.getItem("retrack_demo_user");
      if (demoSession) {
        try {
          setUser(JSON.parse(demoSession));
          setLoading(false);
          return;
        } catch {
          // ignore
        }
      }
    }

    const supabase = getSupabaseClient();

    // Check active Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      startTransition(() => {
        if (session?.user) {
          setUser(session.user);
        }
      });
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const openLoginModal = (redirectUrl = "/") => {
    setLoginRedirectUrl(redirectUrl);
    setIsLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
  };

  const signInAsDemoUser = (name = "홍길동 (조합원)", kakaoProfile?: KakaoProfileOverride) => {
    // kakaoProfile이 있으면(실제 카카오 로그인 완료) 그 카카오 id를 기반으로 한
    // 고유 id/email을 쓴다. 이게 없으면 이전처럼 모든 데모/카카오 로그인이
    // "demo-user-1234" 하나로 뭉쳐서, 서로 다른 사람이 같은 계정처럼 보였다.
    const demo: User = {
      ...DEMO_USER,
      id: kakaoProfile?.id ?? DEMO_USER.id,
      user_metadata: {
        ...DEMO_USER.user_metadata,
        full_name: name,
        name,
        email: kakaoProfile?.email ?? DEMO_USER.user_metadata.email,
        avatar_url: kakaoProfile?.profileImage,
      },
    };
    setUser(demo);
    if (typeof window !== "undefined") {
      localStorage.setItem("retrack_demo_user", JSON.stringify(demo));
    }
    setKakaoLoginError(null);
    setIsLoginModalOpen(false);
  };

  const signInWithKakao = async (nextUrl?: string) => {
    // 카카오 JS SDK v2는 팝업으로 바로 프로필을 주는 v1의 Auth.login()을 더 이상
    // 지원하지 않는다. Auth.authorize()로 카카오 로그인 화면으로 리다이렉트하고,
    // 서버(/auth/kakao/callback)가 토큰 교환/프로필 조회를 마친 뒤 결과를 쿼리
    // 파라미터로 실어 이 페이지로 돌려보내면 위 useEffect가 그걸 받아 로그인을
    // 완료한다. 즉 이 함수는 리다이렉트를 "시작"만 하고 끝나지 않는다.
    //
    // Supabase Authentication > Providers에 Kakao는 아직 설정돼 있지 않아
    // (2026-08-21 확인) supabase.auth.signInWithOAuth는 쓰지 않는다 — 그건 provider가
    // 없을 때 에러를 반환하지 않고 곧장 존재하지 않는 authorize 엔드포인트로
    // 리다이렉트시켜, 사용자 눈에는 앱을 완전히 벗어난 에러 페이지로 튕겨나간다.
    const { redirectToKakaoLogin } = await import("./kakao-sdk");
    const next = nextUrl || loginRedirectUrl || window.location.pathname;
    const redirectUri = `${window.location.origin}/auth/kakao/callback`;
    await redirectToKakaoLogin(redirectUri, next);
  };

  const signInWithGoogle = async (nextUrl?: string) => {
    try {
      const supabase = getSupabaseClient();
      const next = nextUrl || loginRedirectUrl || window.location.pathname;
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) {
        console.warn("Google OAuth not configured on Supabase, falling back to instant demo login:", error);
        signInAsDemoUser("구글 인증 사용자");
      }
    } catch (err) {
      console.warn("Google login fallback to demo user:", err);
      signInAsDemoUser("구글 인증 사용자");
    }
  };

  const signOut = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("retrack_demo_user");
    }
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithKakao,
        signInWithGoogle,
        signInAsDemoUser,
        signOut,
        isLoginModalOpen,
        loginRedirectUrl,
        openLoginModal,
        closeLoginModal,
        kakaoLoginError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
