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
  const [activeTab, setActiveTab] = useState<"feed" | "projects">("feed");
  const [onlyMajor, setOnlyMajor] = useState(false);
  const [projectSearchTerm, setProjectSearchTerm] = useState("");
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

        // 1. Load user's subscriptions
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

        // 2. If there are subscribed projects, load their recent events
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
            {/* KPI Summary Cards */}
            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-black/8 bg-white p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                <p className="text-xs font-medium text-[#777a76]">관심 사업장</p>
                <p className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{projects.length}<span className="text-sm font-normal text-[#777a76] ml-1">개</span></p>
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
            <div className="mt-8 flex items-center justify-between border-b border-black/10 pb-3">
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
            ) : projects.length === 0 ? (
              <div className="mt-8 rounded-3xl border border-black/8 bg-white p-12 text-center shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
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
            ) : (
              <>
                {/* Tab 1: Events Timeline Feed */}
                {activeTab === "feed" && (
                  <section className="mt-8 pb-12">
                    {(() => {
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
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
