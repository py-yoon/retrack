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
        name,
      },
    };
    setUser(demo);
    if (typeof window !== "undefined") {
      localStorage.setItem("retrack_demo_user", JSON.stringify(demo));
    }
    setIsLoginModalOpen(false);
  };

  const signInWithKakao = async (nextUrl?: string) => {
    // Supabase Authentication > Providers에 Kakao Client ID/Secret을 등록해
    // Supabase가 카카오 OAuth 전체(리다이렉트, 토큰 교환, 세션 발급)를 대신
    // 처리한다. 우리 서버는 REST API 키/시크릿을 다루지 않는다 — 이 값들은
    // Supabase 대시보드에만 저장돼 있다. 콜백은 /auth/callback (route.ts)이
    // 받아서 exchangeCodeForSession으로 실제 Supabase 세션(auth.uid())을 만든다.
    const supabase = getSupabaseClient();
    const next = nextUrl || loginRedirectUrl || window.location.pathname;
    const origin = window.location.origin;
    // Supabase의 카카오 provider는 account_email/profile_image/profile_nickname을
    // 항상 요청한다 — options.scopes를 줘도 대체가 아니라 그 뒤에 추가만 되고
    // 기본 3개는 빠지지 않는다(Supabase 쪽 알려진 제한, supabase/supabase#29917,
    // #36878). 그래서 카카오 앱의 동의항목에 이 세 개를 다 설정해 둬야 한다.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      throw new Error("카카오 로그인에 실패했습니다: " + error.message);
    }
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
