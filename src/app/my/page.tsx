"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabaseClient } from "@/lib/supabase/client";

type SubscribedProject = {
  id: string;
  subscription_id: string;
  name: string;
  address: string;
  district: string | null;
  project_type: string | null;
  current_status: string | null;
};

type MyEvent = {
  id: string;
  project_id: string;
  title: string;
  event_type: string;
  importance: number;
  occurred_at: string;
  source_name: string | null;
  source_url: string | null;
  project_name: string;
  district: string | null;
};

function formatDate(date: string) {
  return date.replaceAll("-", ".");
}

export default function MyRadarPage() {
  const { user, loading: authLoading, openLoginModal } = useAuth();
  const [projects, setProjects] = useState<SubscribedProject[]>([]);
  const [events, setEvents] = useState<MyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"feed" | "projects" | "settings">("feed");
  const [onlyMajor, setOnlyMajor] = useState(false);
  const [projectSearchTerm, setProjectSearchTerm] = useState("");
  const [userTier, setUserTier] = useState<"free" | "pro" | "business">("free");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [notifyKakao, setNotifyKakao] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function loadMyData() {
      if (!user) {
        if (!cancelled) {
          setProjects([]);
          setEvents([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const supabase = getSupabaseClient();

        // 1. Load user profile & subscription settings
        const { data: profileData } = await supabase
          .from("users")
          .select("tier, phone_number, notify_kakao, notify_email")
          .eq("id", user.id)
          .maybeSingle();

        if (profileData && !cancelled) {
          setUserTier((profileData.tier as "free" | "pro" | "business") || "free");
          setPhoneNumber(profileData.phone_number || "");
          setNotifyKakao(profileData.notify_kakao ?? true);
          setNotifyEmail(profileData.notify_email ?? true);
        }

        // 2. Load user's subscriptions
        const { data: subData, error: subError } = await supabase
          .from("subscriptions")
          .select("id, project_id, project:projects(id, name, address, district, project_type, current_status)")
          .eq("user_id", user.id);

        if (cancelled) return;
        if (subError) throw subError;

        const subList: SubscribedProject[] = (subData ?? [])
          .map((item) => {
            const p = item.project as unknown as {
              id: string;
              name: string;
              address: string;
              district: string | null;
              project_type: string | null;
              current_status: string | null;
            };
            if (!p) return null;
            return {
              id: p.id,
              subscription_id: item.id,
              name: p.name,
              address: p.address,
              district: p.district,
              project_type: p.project_type,
              current_status: p.current_status,
            };
          })
          .filter((item): item is SubscribedProject => item !== null);

        setProjects(subList);

        // 3. If there are subscribed projects, load their recent events
        if (subList.length > 0) {
          const projectIds = subList.map((p) => p.id);
          const { data: eventData, error: eventError } = await supabase
            .from("events")
            .select("id, project_id, title, event_type, importance, occurred_at, source_name, source_url, project:projects(name, district)")
            .in("project_id", projectIds)
            .order("occurred_at", { ascending: false })
            .limit(50);

          if (cancelled) return;
          if (eventError) throw eventError;

          const eventList: MyEvent[] = (eventData ?? []).map((e) => {
            const p = e.project as unknown as { name: string; district: string | null } | null;
            return {
              id: e.id,
              project_id: e.project_id,
              title: e.title,
              event_type: e.event_type,
              importance: e.importance,
              occurred_at: e.occurred_at,
              source_name: e.source_name,
              source_url: e.source_url,
              project_name: p?.name ?? "관심 사업장",
              district: p?.district ?? null,
            };
          });

          setEvents(eventList);
        } else {
          setEvents([]);
        }
      } catch (err) {
        console.error("Error loading my radar data:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (!authLoading) {
      loadMyData();
    }

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const handleSaveSettings = async () => {
    if (!user) return;
    setSettingsSaving(true);
    setSettingsMessage("");
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("users")
        .update({
          phone_number: phoneNumber.trim() || null,
          notify_kakao: notifyKakao,
          notify_email: notifyEmail,
        })
        .eq("id", user.id);

      if (error) throw error;
      setSettingsMessage("알림 설정이 저장되었습니다.");
      setTimeout(() => setSettingsMessage(""), 3000);
    } catch (e) {
      console.error("Save settings error:", e);
      setSettingsMessage("설정 저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleUnsubscribe = async (projectId: string) => {
    if (!user) return;
    try {
      const supabase = getSupabaseClient();
      await supabase.from("subscriptions").delete().eq("user_id", user.id).eq("project_id", projectId);
      startTransition(() => {
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
        setEvents((prev) => prev.filter((e) => e.project_id !== projectId));
      });
    } catch (e) {
      console.error("Unsubscribe error:", e);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#171918]">
      <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10 sm:py-14">
        <Header />

        <section className="pt-14">
          <p className="text-sm font-semibold tracking-[0.12em] text-[#e6523a]">MY RADAR</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">내 관심 사업장 피드</h1>
          <p className="mt-4 text-[#6e716e]">
            내가 등록한 정비사업장의 최신 공고, 인가 및 단계 변화를 실시간으로 모아봅니다.
          </p>
        </section>

        {/* Not Logged In State */}
        {!authLoading && !user && (
          <section className="mt-12 rounded-3xl border border-black/8 bg-white p-8 text-center sm:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl text-amber-500">
              ⭐
            </div>
            <h2 className="mt-5 text-2xl font-bold tracking-tight">로그인이 필요합니다</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#6e716e]">
              카카오 또는 Google 계정으로 3초 만에 로그인하고, 관심 있는 사업장을 등록하여 변동 소식을 놓치지 마세요.
            </p>
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => openLoginModal("/my")}
                className="rounded-2xl bg-[#171918] px-6 py-3 text-sm font-semibold text-white transition hover:bg-black active:scale-[0.98]"
              >
                카카오 / Google로 시작하기
              </button>
            </div>
          </section>
        )}

        {/* Logged In State */}
        {user && (
          <>
            {/* Membership & Status Banner */}
            <div className="mt-8 flex items-center justify-between gap-4 rounded-3xl border border-black/8 bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-xl text-emerald-600 font-bold">
                  ⭐
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-[#171918]">내 정비사업 레이더</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      {projects.length}개 사업장 모니터링 중
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#6e716e]">
                    관심 사업장의 중요 고시공고가 발생하면 실시간으로 감지하여 피드를 업데이트합니다.
                  </p>
                </div>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-black/8 bg-white p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                <p className="text-xs font-medium text-[#777a76]">관심 사업장</p>
                <p className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  {projects.length}
                  <span className="text-xs font-normal text-[#777a76] ml-1">
                    {userTier === "free" ? "/ 3개" : "개 (무제한)"}
                  </span>
                </p>
              </div>
              <div className="rounded-2xl border border-black/8 bg-white p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                <p className="text-xs font-medium text-[#777a76]">변동 공고 피드</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-600 sm:text-3xl">{events.length}<span className="text-sm font-normal text-[#777a76] ml-1">건</span></p>
              </div>
              <div className="rounded-2xl border border-black/8 bg-white p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                <p className="text-xs font-medium text-[#777a76]">주요 인가/고시</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-rose-600 sm:text-3xl">{events.filter(e => e.importance === 3).length}<span className="text-sm font-normal text-[#777a76] ml-1">건</span></p>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("feed")}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    activeTab === "feed"
                      ? "bg-[#171918] text-white"
                      : "text-[#777a76] hover:bg-black/5 hover:text-[#171918]"
                  }`}
                >
                  변화 타임라인 ({events.length}건)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("projects")}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    activeTab === "projects"
                      ? "bg-[#171918] text-white"
                      : "text-[#777a76] hover:bg-black/5 hover:text-[#171918]"
                  }`}
                >
                  관심 사업장 목록 ({projects.length}개)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("settings")}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    activeTab === "settings"
                      ? "bg-[#171918] text-white"
                      : "text-[#777a76] hover:bg-black/5 hover:text-[#171918]"
                  }`}
                >
                  🔔 알림 및 멤버십 설정
                </button>
              </div>

              {/* Feed specific toggle */}
              {activeTab === "feed" && events.length > 0 && (
                <button
                  type="button"
                  onClick={() => setOnlyMajor(!onlyMajor)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    onlyMajor
                      ? "bg-rose-500 text-white"
                      : "border border-black/10 bg-white text-[#777a76] hover:border-black/30 hover:text-[#171918]"
                  }`}
                >
                  {onlyMajor ? "✓ 중요 공고만 보는 중" : "중요 공고만 보기"}
                </button>
              )}
            </div>

            {loading ? (
              <div className="mt-8 rounded-2xl bg-white p-12 text-center text-sm text-[#777a76]">
                관심 사업장 정보를 불러오는 중입니다...
              </div>
            ) : (
              <>
                {/* Tab 1: Events Timeline Feed */}
                {activeTab === "feed" && (
                  <section className="mt-8 pb-12">
                    {projects.length === 0 ? (
                      <div className="rounded-3xl border border-black/8 bg-white p-12 text-center shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                        <p className="text-3xl">🏢</p>
                        <h3 className="mt-4 text-xl font-bold">아직 등록된 관심 사업장이 없습니다</h3>
                        <p className="mx-auto mt-2 max-w-sm text-sm text-[#6e716e]">
                          관심 있는 재개발·재건축 사업장을 검색하고, 상세 페이지에서 별표(관심 사업장 등록)를 눌러보세요.
                        </p>
                        <div className="mt-6">
                          <Link
                            href="/"
                            className="inline-block rounded-xl bg-[#171918] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
                          >
                            사업장 검색하러 가기
                          </Link>
                        </div>
                      </div>
                    ) : (() => {
                      const displayedEvents = onlyMajor ? events.filter(e => e.importance === 3) : events;
                      if (displayedEvents.length === 0) {
                        return (
                          <div className="rounded-2xl bg-white p-8 text-center text-sm text-[#777a76]">
                            {onlyMajor ? "등록된 관심 사업장에 중요 공고(중요도 3)가 없습니다." : "등록된 관심 사업장에 최근 발생한 변화 공고가 없습니다."}
                          </div>
                        );
                      }
                      return (
                        <div className="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                          {displayedEvents.map((event, index) => (
                            <article
                              key={event.id}
                              className={`flex items-start gap-4 p-5 sm:p-6 transition hover:bg-[#fcfcfa] ${
                                index !== displayedEvents.length - 1 ? "border-b border-black/7" : ""
                              }`}
                            >
                              <span
                                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                                  event.importance === 3 ? "bg-rose-500" : "bg-orange-400"
                                }`}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#777a76]">
                                  <time className="font-mono">{formatDate(event.occurred_at)}</time>
                                  {event.district && (
                                    <span className="rounded-md bg-black/5 px-2 py-0.5 font-medium text-[#171918]">
                                      {event.district}
                                    </span>
                                  )}
                                  <span className="rounded-md bg-black/5 px-2 py-0.5 font-medium text-[#171918]">
                                    {event.event_type}
                                  </span>
                                  {event.importance === 3 && (
                                    <span className="font-semibold text-rose-600">중요</span>
                                  )}
                                </div>

                                <Link
                                  className="mt-2 block font-semibold leading-6 tracking-tight text-[#171918] underline-offset-4 hover:underline"
                                  href={`/projects/${event.project_id}`}
                                >
                                  {event.project_name}
                                </Link>
                                <p className="mt-1 text-sm leading-relaxed text-[#444]">{event.title}</p>

                                {/* AI 3줄 요약 미리보기 */}
                                {event.importance === 3 && (
                                  <div className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-xs text-[#333]">
                                    <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1">
                                      <span>💡 AI 핵심 요약</span>
                                      <span className="rounded bg-amber-200/80 px-1 py-0.2 text-[10px] text-amber-900">Pro</span>
                                    </div>
                                    <p className="text-[#555] leading-relaxed">
                                      • 서울시 고시 기준 사업시행/관리처분 인가 절차가 진행되었습니다.<br />
                                      • 용적률 및 정비구역 세부 변경 사항은 하단 원문 고시문에서 직접 확인 가능합니다.
                                    </p>
                                  </div>
                                )}

                                <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#777a76]">
                                  <span>{event.source_name ?? "출처 정보 없음"}</span>
                                  {event.source_url && (
                                    <a
                                      className="underline underline-offset-4 hover:text-[#171918]"
                                      href={event.source_url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      원문 보기 ↗
                                    </a>
                                  )}
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      );
                    })()}
                  </section>
                )}

                {/* Tab 2: Subscribed Projects List */}
                {activeTab === "projects" && (
                  <section className="mt-6 pb-12">
                    <div className="mb-4">
                      <input
                        type="text"
                        placeholder="내 관심 사업장 내 검색 (사업장명 또는 자치구)..."
                        value={projectSearchTerm}
                        onChange={(e) => setProjectSearchTerm(e.target.value)}
                        className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none placeholder:text-[#989b96] focus:border-black/30"
                      />
                    </div>
                    {(() => {
                      const filtered = projects.filter(
                        (p) =>
                          p.name.toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
                          (p.district && p.district.includes(projectSearchTerm)) ||
                          p.address.toLowerCase().includes(projectSearchTerm.toLowerCase())
                      );

                      if (filtered.length === 0) {
                        return (
                          <div className="rounded-2xl bg-white p-8 text-center text-sm text-[#777a76]">
                            일치하는 관심 사업장이 없습니다.
                          </div>
                        );
                      }

                      return (
                        <div className="grid gap-4 sm:grid-cols-2">
                          {filtered.map((project) => (
                            <div
                              key={project.id}
                              className="flex flex-col justify-between rounded-2xl border border-black/8 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition hover:border-black/20"
                            >
                              <div>
                                <div className="flex items-center justify-between">
                                  {project.district && (
                                    <span className="rounded-md bg-black/5 px-2 py-0.5 text-xs font-semibold text-[#171918]">
                                      {project.district}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleUnsubscribe(project.id)}
                                    className="text-xs text-[#777a76] hover:text-rose-600"
                                  >
                                    관심 해제
                                  </button>
                                </div>
                                <Link
                                  href={`/projects/${project.id}`}
                                  className="mt-3 block font-bold text-lg text-[#171918] hover:underline"
                                >
                                  {project.name}
                                </Link>
                                <p className="mt-1 text-xs text-[#777a76]">{project.address}</p>
                              </div>

                              <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-3 text-xs">
                                <span className="text-[#6e716e]">{project.project_type ?? "정비사업"}</span>
                                <span className="font-semibold text-emerald-700">
                                  {project.current_status ?? "단계 확인 중"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </section>
                )}

                {/* Tab 3: Notification & Membership Settings */}
                {activeTab === "settings" && (
                  <section className="mt-6 max-w-2xl space-y-6 pb-16">
                    {/* Alimtalk Settings Card */}
                    <div className="rounded-3xl border border-black/8 bg-white p-6 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-lg">
                          💬
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-[#171918]">실시간 카카오 알림톡 설정</h3>
                          <p className="text-xs text-[#6e716e]">내 관심 사업장의 중요 공고가 등록되면 즉시 알림톡을 발송합니다.</p>
                        </div>
                      </div>

                      <div className="mt-6 space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#171918] mb-1.5" htmlFor="phone-input">
                            알림톡 수신 휴대폰 번호
                          </label>
                          <input
                            id="phone-input"
                            type="tel"
                            placeholder="010-1234-5678"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-2.5 text-sm outline-none placeholder:text-[#989b96] focus:border-black/30 focus:bg-white"
                          />
                          <p className="mt-1 text-[11px] text-[#777a76]">하이픈(-) 없이 또는 포함하여 입력해 주세요.</p>
                        </div>

                        <div className="pt-3 border-t border-black/5 space-y-3">
                          <label className="flex items-center justify-between cursor-pointer">
                            <div>
                              <p className="text-xs font-semibold text-[#171918]">카카오 알림톡 실시간 수신</p>
                              <p className="text-[11px] text-[#777a76]">중요 인가/고시(중요도 3) 발생 시 즉시 카카오톡으로 발송</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={notifyKakao}
                              onChange={(e) => setNotifyKakao(e.target.checked)}
                              className="h-4 w-4 rounded accent-[#171918]"
                            />
                          </label>

                          <label className="flex items-center justify-between cursor-pointer">
                            <div>
                              <p className="text-xs font-semibold text-[#171918]">주간 변동 이메일 뉴스레터</p>
                              <p className="text-[11px] text-[#777a76]">매주 월요일 내 관심 사업장의 변동 이력 요약 메일 수신</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={notifyEmail}
                              onChange={(e) => setNotifyEmail(e.target.checked)}
                              className="h-4 w-4 rounded accent-[#171918]"
                            />
                          </label>
                        </div>

                        {settingsMessage && (
                          <p className={`text-xs font-semibold ${settingsMessage.includes("실패") ? "text-rose-600" : "text-emerald-600"}`}>
                            {settingsMessage}
                          </p>
                        )}

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleSaveSettings}
                            disabled={settingsSaving}
                            className="rounded-xl bg-[#171918] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-black active:scale-[0.98]"
                          >
                            {settingsSaving ? "저장 중..." : "알림 설정 저장"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Membership Plan Card */}
                    <div className="rounded-3xl border border-black/8 bg-white p-6 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                      <h3 className="font-bold text-base text-[#171918]">구독 멤버십 정보</h3>
                      <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#f7f7f4] p-4 text-xs">
                        <div>
                          <p className="font-bold text-[#171918]">
                            {userTier === "free" ? "Free 플랜 (무료)" : userTier === "pro" ? "Pro 멤버십 (월 14,900원)" : "Business 플랜"}
                          </p>
                          <p className="mt-0.5 text-[#777a76]">
                            {userTier === "free" ? "관심 사업장 최대 3개 등록 가능" : "관심 사업장 무제한 등록 & 실시간 알림톡 발송"}
                          </p>
                        </div>
                        <Link
                          href="/pricing"
                          className="rounded-xl bg-white border border-black/10 px-3.5 py-2 font-semibold text-[#171918] hover:bg-black/5"
                        >
                          요금제 변경 ➔
                        </Link>
                      </div>
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
