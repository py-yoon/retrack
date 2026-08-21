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
      },
    };
    setUser(demo);
    if (typeof window !== "undefined") {
      localStorage.setItem("retrack_demo_user", JSON.stringify(demo));
    }
    setIsLoginModalOpen(false);
  };

  const signInWithKakao = async (nextUrl?: string) => {
    try {
      // 1. Try Direct Kakao JavaScript SDK Popup
      const { loginWithKakaoDirect } = await import("./kakao-sdk");
      const profile = await loginWithKakaoDirect();
      if (profile) {
        signInAsDemoUser(`${profile.nickname} (카카오)`);
        return;
      }
    } catch (directErr) {
      console.warn("Direct Kakao SDK popup bypass:", directErr);
    }

    // 2. Supabase OAuth Fallback or Instant Demo Session
    try {
      const supabase = getSupabaseClient();
      const next = nextUrl || loginRedirectUrl || window.location.pathname;
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) {
        signInAsDemoUser("카카오 인증 사용자");
      }
    } catch {
      signInAsDemoUser("카카오 인증 사용자");
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
