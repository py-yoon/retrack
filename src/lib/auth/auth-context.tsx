"use client";

import React, { createContext, useContext, useEffect, useState, useTransition } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithKakao: (nextUrl?: string) => Promise<void>;
  signInWithGoogle: (nextUrl?: string) => Promise<void>;
  signInAsDemoUser: (name?: string) => void;
  signOut: () => Promise<void>;
  isLoginModalOpen: boolean;
  loginRedirectUrl: string;
  openLoginModal: (redirectUrl?: string) => void;
  closeLoginModal: () => void;
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
  const [, startTransition] = useTransition();

  useEffect(() => {
    // 카카오 SDK를 미리 로드/초기화해 둔다. 로그인 버튼 클릭 시점에 스크립트를
    // 그때부터 불러오면(await 지연) 팝업 오픈이 "사용자 제스처" 컨텍스트를 벗어나
    // Safari 등에서 팝업 차단에 걸릴 수 있다.
    import("./kakao-sdk").then(({ loadKakaoSdk }) => loadKakaoSdk());
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

  const signInAsDemoUser = (name = "홍길동 (조합원)") => {
    const demo: User = {
      ...DEMO_USER,
      user_metadata: {
        ...DEMO_USER.user_metadata,
        full_name: name,
      },
    };
    setUser(demo);
    if (typeof window !== "undefined") {
      localStorage.setItem("retrack_demo_user", JSON.stringify(demo));
    }
    setIsLoginModalOpen(false);
  };

  const signInWithKakao = async (_nextUrl?: string) => {
    // 카카오 JS SDK 직접 팝업 로그인 (Supabase Provider 설정 없이 동작).
    //
    // Supabase Authentication > Providers에 Kakao가 아직 설정돼 있지 않다
    // (2026-08-21 확인). 이 상태에서 supabase.auth.signInWithOAuth({provider:"kakao"})를
    // 호출하면 에러를 반환하는 게 아니라 즉시 브라우저를 Supabase의 authorize
    // 엔드포인트로 리다이렉트시키고, 거기서 "provider not enabled" 에러를 만나
    // 사용자 눈에는 이 앱을 완전히 벗어난 에러 페이지로 튕겨나가는 것처럼 보인다.
    // Provider를 실제로 설정하기 전까지는 이 경로를 시도하지 않는다.
    const { loginWithKakaoDirect } = await import("./kakao-sdk");
    const profile = await loginWithKakaoDirect();
    if (!profile) throw new Error("카카오 로그인이 취소되었습니다.");
    signInAsDemoUser(`${profile.nickname} (카카오)`);
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
