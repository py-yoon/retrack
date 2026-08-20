"use client";

import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function SubscriptionButton({ projectId }: { projectId: string }) {
  const { user, openLoginModal } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function checkSubscription() {
      if (!user) {
        setSubscribed(false);
        setChecking(false);
        return;
      }

      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .eq("project_id", projectId)
          .maybeSingle();

        if (!cancelled && !error) {
          setSubscribed(Boolean(data));
        }
      } catch (e) {
        console.error("Error checking subscription:", e);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    checkSubscription();

    return () => {
      cancelled = true;
    };
  }, [user, projectId]);

  const toggleSubscription = async () => {
    if (!user) {
      openLoginModal(window.location.pathname);
      return;
    }

    const previousState = subscribed;

    try {
      const supabase = getSupabaseClient();

      if (previousState) {
        // Delete subscription
        setSubscribed(false);
        const { error } = await supabase
          .from("subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("project_id", projectId);
        if (error) throw error;
      } else {
        // Insert subscription
        setSubscribed(true);
        const { error } = await supabase
          .from("subscriptions")
          .insert({ user_id: user.id, project_id: projectId });
        if (error) throw error;
      }
    } catch (err) {
      console.error("Subscription toggle failed:", err);
      // Revert optimistic update
      startTransition(() => {
        setSubscribed(previousState);
      });
    }
  };

  if (checking) {
    return (
      <div className="h-10 w-32 animate-pulse rounded-xl bg-black/5" />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleSubscription}
      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] ${
        subscribed
          ? "border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 shadow-[0_2px_8px_rgb(245,158,11,0.15)]"
          : "border border-black/10 bg-white text-[#171918] hover:bg-[#f7f7f4] shadow-[0_2px_8px_rgb(0,0,0,0.02)]"
      }`}
    >
      <span className={subscribed ? "text-amber-500" : "text-[#777a76]"}>
        {subscribed ? "★" : "☆"}
      </span>
      <span>{subscribed ? "관심 사업장 등록됨" : "관심 사업장 등록"}</span>
    </button>
  );
}

