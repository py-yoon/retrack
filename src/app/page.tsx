"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { getSupabaseClient } from "@/lib/supabase/client";

type RecentUpdate = {
  id: string;
  projectId: string | null;
  projectName: string;
  district: string | null;
  title: string;
  date: string;
  importance: number;
};

type SearchResult = {
  id: string;
  name: string;
  address: string;
  district: string | null;
  current_status: string | null;
};

const emptyStats = [
  { label: "중요한 변화", count: 0, color: "bg-rose-500", link: "/changes?importance=3" },
  { label: "일반 변화", count: 0, color: "bg-orange-400", link: "/changes?importance=2" },
  { label: "전체 변화", count: 0, color: "bg-emerald-500", link: "/changes" },
];

const POPULAR_DISTRICTS = ["강남구", "서초구", "송파구", "용산구", "성동구", "마포구", "영등포구", "동작구"];

function formatDate(date: string) {
  return date.replaceAll("-", ".");
}

export default function Home() {
  const [recentUpdates, setRecentUpdates] = useState<RecentUpdate[]>([]);
  const [summaryStats, setSummaryStats] = useState(emptyStats);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const supabase = getSupabaseClient();
        const [totalRes, majorRes, recentEventsRes] = await Promise.all([
          supabase.from("events").select("id", { count: "exact", head: true }),
          supabase.from("events").select("id", { count: "exact", head: true }).eq("importance", 3),
          supabase
            .from("events")
            .select("id,project_id,title,importance,occurred_at,project:projects(name,district)")
            .order("occurred_at", { ascending: false })
            .limit(6),
        ]);

        if (recentEventsRes.error) throw recentEventsRes.error;

        const totalCount = totalRes.count ?? 0;
        const majorCount = majorRes.count ?? 0;
        const normalCount = Math.max(0, totalCount - majorCount);

        setSummaryStats([
          { label: "주요 인가/고시", count: majorCount, color: "bg-rose-500", link: "/changes?importance=3" },
          { label: "일반 공고/열람", count: normalCount, color: "bg-orange-400", link: "/changes?importance=2" },
          { label: "전체 변화 기록", count: totalCount, color: "bg-emerald-500", link: "/changes" },
        ]);

        const recentRows = (recentEventsRes.data ?? []) as unknown as Array<{
          id: string;
          project_id: string | null;
          title: string;
          importance: number;
          occurred_at: string;
          project: { name: string; district: string | null } | null;
        }>;

        setRecentUpdates(
          recentRows.map((event) => ({
            id: event.id,
            projectId: event.project_id,
            projectName: event.project?.name ?? "서울 정비사업",
            district: event.project?.district ?? null,
            title: event.title,
            date: formatDate(event.occurred_at),
            importance: event.importance,
          }))
        );
      } catch {
        setDashboardError("변화 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        setDashboardLoading(false);
      }
    }
    loadDashboard();
  }, []);

  async function searchProjects(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    if (!term) {
      setResults([]);
      setSearchError("");
      return;
    }

    setSearching(true);
    setSearchError("");
    try {
      const supabase = getSupabaseClient();
      const [byName, byAddress] = await Promise.all([
        supabase
          .from("projects")
          .select("id,name,address,district,current_status")
          .ilike("name", `%${term}%`)
          .limit(10),
        supabase
          .from("projects")
          .select("id,name,address,district,current_status")
          .ilike("address", `%${term}%`)
          .limit(10),
      ]);
      if (byName.error) throw byName.error;
      if (byAddress.error) throw byAddress.error;
      const merged = [...(byName.data ?? []), ...(byAddress.data ?? [])];
      setResults(
        merged.filter((project, index, all) => all.findIndex((item) => item.id === project.id) === index)
      );
    } catch {
      setSearchError("검색 중 문제가 발생했습니다. Supabase 연결 설정을 확인해 주세요.");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#171918]">
      <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10 sm:py-14">
        <Header />

        <section className="pt-16 sm:pt-24">
          <p className="mb-3 text-sm font-semibold tracking-[0.12em] text-[#e6523a]">URBAN RENEWAL INTELLIGENCE</p>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">
            서울 정비사업의<br />변화를 가장 먼저.
          </h1>

          <form className="mt-10 max-w-2xl" onSubmit={searchProjects}>
            <label
              className="flex h-16 items-center gap-4 rounded-2xl border border-black/10 bg-white px-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition focus-within:border-black/30"
              htmlFor="project-search"
            >
              <svg
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-[#777a76]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="6" />
                <path d="m16 16 4 4" />
              </svg>
              <input
                id="project-search"
                className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#989b96]"
                placeholder="사업장명, 도로명/지번 주소 또는 자치구 검색"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <kbd className="hidden rounded border border-black/10 px-2 py-1 text-xs text-[#777a76] sm:block">
                Enter
              </kbd>
            </label>
            {searching && <p className="mt-3 text-sm text-[#777a76]">사업장을 검색 중입니다...</p>}
            {searchError && <p className="mt-3 text-sm text-rose-600">{searchError}</p>}
            {!searching && query.trim() && !searchError && results.length === 0 && (
              <p className="mt-3 text-sm text-[#777a76]">검색 결과가 없습니다.</p>
            )}
            {results.length > 0 && (
              <div className="mt-3 overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                {results.map((project) => (
                  <Link
                    className="block border-b border-black/7 px-5 py-3.5 transition hover:bg-[#f7f7f4] last:border-0"
                    href={`/projects/${project.id}`}
                    key={project.id}
                  >
                    <div className="flex items-center gap-2">
                      {project.district && (
                        <span className="rounded bg-black/5 px-1.5 py-0.5 text-xs font-semibold text-[#171918]">
                          {project.district}
                        </span>
                      )}
                      <p className="font-semibold">{project.name}</p>
                    </div>
                    <p className="mt-1 text-sm text-[#777a76]">
                      {project.address}
                      {project.current_status ? ` · ${project.current_status}` : ""}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </form>

          {/* Popular Districts Quick Links */}
          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-[#777a76]">
            <span className="font-medium text-[#171918]">자치구 바로가기:</span>
            {POPULAR_DISTRICTS.map((d) => (
              <Link
                key={d}
                href={`/changes?district=${encodeURIComponent(d)}`}
                className="rounded-lg border border-black/8 bg-white px-2.5 py-1 text-[#444] transition hover:border-black/20 hover:text-[#171918]"
              >
                {d}
              </Link>
            ))}
            <Link
              href="/changes"
              className="rounded-lg border border-black/8 bg-white px-2.5 py-1 font-medium text-[#e6523a] transition hover:border-[#e6523a]"
            >
              전체 25개 구 보기 ↗
            </Link>
          </div>
        </section>

        {/* Updates Statistics */}
        <section className="mt-20 sm:mt-24" aria-labelledby="stats-heading">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-sm text-[#777a76]">서울시 공공데이터 레이더</p>
              <h2 id="stats-heading" className="mt-1 text-2xl font-semibold tracking-[-0.04em]">
                정비사업 변화 현황
              </h2>
            </div>
            <Link className="text-sm font-medium underline underline-offset-4 hover:text-[#e6523a]" href="/changes">
              전체 변화 보기 ↗
            </Link>
          </div>
          {dashboardError ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              {dashboardError}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {summaryStats.map((stat) => (
                <Link
                  key={stat.label}
                  href={stat.link}
                  className="flex items-center justify-between rounded-2xl bg-white px-5 py-6 shadow-[0_8px_30px_rgb(0,0,0,0.035)] transition hover:shadow-[0_8px_30px_rgb(0,0,0,0.07)]"
                >
                  <div className="flex items-center gap-3 text-sm font-medium">
                    <span className={`h-2.5 w-2.5 rounded-full ${stat.color}`} />
                    {stat.label}
                  </div>
                  <strong className="text-3xl tracking-[-0.06em]">
                    {dashboardLoading ? "–" : stat.count}
                  </strong>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent Updates Feed */}
        <section className="mt-16 pb-12" aria-labelledby="recent-heading">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 id="recent-heading" className="text-2xl font-semibold tracking-[-0.04em]">
                최신 변화 피드
              </h2>
              <p className="mt-1 text-xs text-[#777a76]">공고 및 인가 이력이 등록된 최신 순</p>
            </div>
            <Link className="text-sm text-[#777a76] underline underline-offset-4 hover:text-[#171918]" href="/changes">
              전체 피드 보기
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            {dashboardLoading && (
              <p className="px-5 py-8 text-sm text-[#777a76]">변화 데이터를 불러오는 중입니다...</p>
            )}
            {!dashboardLoading && !dashboardError && recentUpdates.length === 0 && (
              <p className="px-5 py-8 text-sm text-[#777a76]">최근 7일 내 등록된 변화가 없습니다.</p>
            )}
            {recentUpdates.map((update, index) => (
              <article
                key={update.id}
                className={`flex items-center gap-4 px-5 py-5 sm:px-7 transition hover:bg-[#fcfcfa] ${
                  index !== recentUpdates.length - 1 ? "border-b border-black/7" : ""
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    update.importance === 3 ? "bg-rose-500" : "bg-orange-400"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {update.district && (
                      <span className="rounded bg-black/5 px-1.5 py-0.5 text-xs font-semibold text-[#171918]">
                        {update.district}
                      </span>
                    )}
                    {update.projectId ? (
                      <Link
                        className="font-semibold tracking-[-0.025em] underline-offset-4 hover:underline"
                        href={`/projects/${update.projectId}`}
                      >
                        {update.projectName}
                      </Link>
                    ) : (
                      <h3 className="font-semibold tracking-[-0.025em]">{update.projectName}</h3>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-[#777a76]">{update.title}</p>
                </div>
                <time className="shrink-0 font-mono text-sm text-[#777a76]">{update.date}</time>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

