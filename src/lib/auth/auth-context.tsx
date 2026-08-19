"use client";

import React, { createContext, useContext, useEffect, useState, useTransition } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithKakao: (nextUrl?: string) => Promise<void>;
  signInWithGoogle: (nextUrl?: string) => Promise<void>;
  signOut: () => Promise<void>;
  isLoginModalOpen: boolean;
  loginRedirectUrl: string;
  openLoginModal: (redirectUrl?: string) => void;
  closeLoginModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginRedirectUrl, setLoginRedirectUrl] = useState("/");
  const [, startTransition] = useTransition();

  useEffect(() => {
    const supabase = getSupabaseClient();

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      startTransition(() => {
        setUser(session?.user ?? null);
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

  const signInWithKakao = async (nextUrl?: string) => {
    const supabase = getSupabaseClient();
    const next = nextUrl || loginRedirectUrl || window.location.pathname;
    const origin = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  };

  const signInWithGoogle = async (nextUrl?: string) => {
    const supabase = getSupabaseClient();
    const next = nextUrl || loginRedirectUrl || window.location.pathname;
    const origin = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  };

  const signOut = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithKakao,
        signInWithGoogle,
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
