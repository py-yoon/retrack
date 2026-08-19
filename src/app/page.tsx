"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";

type RecentUpdate = { id: string; projectId: string | null; district: string; title: string; date: string; importance: number };

const emptyStats = [
  { label: "중요한 변화", count: 0, color: "bg-rose-500" },
  { label: "일반 변화", count: 0, color: "bg-orange-400" },
  { label: "신규 사업", count: 0, color: "bg-emerald-500" },
];

function seoulDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

function formatDate(date: string) {
  return date.replaceAll("-", ".");
}

export default function Home() {
  const [recentUpdates, setRecentUpdates] = useState<RecentUpdate[]>([]);
  const [summaryStats, setSummaryStats] = useState(emptyStats);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; address: string; current_status: string | null }[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const today = seoulDate();
  const weekAgo = seoulDate(-6);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const supabase = getSupabaseClient();
        const [todayEvents, recentEvents] = await Promise.all([
          supabase.from("events").select("importance,event_type").eq("occurred_at", today),
          supabase
            .from("events")
            .select("id,project_id,title,importance,occurred_at,project:projects(name)")
            .gte("occurred_at", weekAgo)
            .lte("occurred_at", today)
            .order("occurred_at", { ascending: false })
            .limit(3),
        ]);
        if (todayEvents.error) throw todayEvents.error;
        if (recentEvents.error) throw recentEvents.error;

        const statRows = todayEvents.data as Array<{ importance: number; event_type: string }>;
        const recentRows = recentEvents.data as unknown as Array<{
          id: string; project_id: string | null; title: string; importance: number; occurred_at: string; project: { name: string } | null;
        }>;
        setSummaryStats([
          { ...emptyStats[0], count: statRows.filter((event) => event.importance === 3).length },
          { ...emptyStats[1], count: statRows.filter((event) => event.importance < 3 && event.event_type !== "신규").length },
          { ...emptyStats[2], count: statRows.filter((event) => event.event_type === "신규").length },
        ]);
        setRecentUpdates(recentRows.map((event) => ({
          id: event.id,
          projectId: event.project_id,
          district: event.project?.name ?? "서울 정비사업",
          title: event.title,
          date: formatDate(event.occurred_at),
          importance: event.importance,
        })));
      } catch {
        setDashboardError("변화 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        setDashboardLoading(false);
      }
    }
    loadDashboard();
  }, [today, weekAgo]);

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
        supabase.from("projects").select("id,name,address,current_status").ilike("name", `%${term}%`).limit(10),
        supabase.from("projects").select("id,name,address,current_status").ilike("address", `%${term}%`).limit(10),
      ]);
      if (byName.error) throw byName.error;
      if (byAddress.error) throw byAddress.error;
      const merged = [...(byName.data ?? []), ...(byAddress.data ?? [])];
      setResults(merged.filter((project, index, all) => all.findIndex((item) => item.id === project.id) === index));
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
        <header className="flex items-center justify-between border-b border-black/10 pb-6">
          <span className="text-lg font-bold tracking-[-0.06em]">RE:TRACK</span>
          <span className="text-sm text-[#6e716e]">서울 정비사업 레이더</span>
        </header>

        <section className="pt-16 sm:pt-24">
          <p className="mb-3 text-sm font-semibold tracking-[0.12em] text-[#e6523a]">URBAN RENEWAL INTELLIGENCE</p>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">서울 정비사업의<br />변화를 가장 먼저.</h1>

          <form className="mt-10 max-w-2xl" onSubmit={searchProjects}>
            <label className="flex h-16 items-center gap-4 rounded-2xl border border-black/10 bg-white px-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition focus-within:border-black/30" htmlFor="project-search">
              <svg aria-hidden="true" className="h-5 w-5 shrink-0 text-[#777a76]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
              <input id="project-search" className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#989b96]" placeholder="사업장명 또는 주소를 검색하세요" type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
              <kbd className="hidden rounded border border-black/10 px-2 py-1 text-xs text-[#777a76] sm:block">⌘ K</kbd>
            </label>
            {searching && <p className="mt-3 text-sm text-[#777a76]">사업장을 검색 중입니다...</p>}
            {searchError && <p className="mt-3 text-sm text-rose-600">{searchError}</p>}
            {!searching && query.trim() && !searchError && results.length === 0 && <p className="mt-3 text-sm text-[#777a76]">검색 결과가 없습니다.</p>}
            {results.length > 0 && <div className="mt-3 overflow-hidden rounded-xl border border-black/8 bg-white">
              {results.map((project) => <Link className="block border-b border-black/7 px-4 py-3 transition hover:bg-[#f7f7f4] last:border-0" href={`/projects/${project.id}`} key={project.id}><p className="font-semibold">{project.name}</p><p className="mt-1 text-sm text-[#777a76]">{project.address}{project.current_status ? ` · ${project.current_status}` : ""}</p></Link>)}
            </div>}
          </form>
        </section>

        <section className="mt-20 sm:mt-28" aria-labelledby="today-heading">
          <div className="mb-6 flex items-end justify-between">
            <div><p className="text-sm text-[#777a76]">{formatDate(today)} 기준</p><h2 id="today-heading" className="mt-1 text-2xl font-semibold tracking-[-0.04em]">오늘의 변화</h2></div>
            <Link className="text-sm font-medium underline underline-offset-4" href="/changes">전체 보기</Link>
          </div>
          {dashboardError ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{dashboardError}</p> : <div className="grid gap-3 sm:grid-cols-3">
            {summaryStats.map((stat) => <article key={stat.label} className="flex items-center justify-between rounded-2xl bg-white px-5 py-6 shadow-[0_8px_30px_rgb(0,0,0,0.035)]"><div className="flex items-center gap-3 text-sm font-medium"><span className={`h-2.5 w-2.5 rounded-full ${stat.color}`} />{stat.label}</div><strong className="text-3xl tracking-[-0.06em]">{dashboardLoading ? "–" : stat.count}</strong></article>)}
          </div>}
        </section>

        <section className="mt-16 pb-10" aria-labelledby="recent-heading">
          <div className="mb-5 flex items-end justify-between"><h2 id="recent-heading" className="text-2xl font-semibold tracking-[-0.04em]">최근 변화</h2><Link className="text-sm text-[#777a76] underline underline-offset-4" href="/changes?period=7d">최근 7일 전체</Link></div>
          <div className="overflow-hidden rounded-2xl border border-black/8 bg-white">
            {dashboardLoading && <p className="px-5 py-8 text-sm text-[#777a76]">변화 데이터를 불러오는 중입니다...</p>}
            {!dashboardLoading && !dashboardError && recentUpdates.length === 0 && <p className="px-5 py-8 text-sm text-[#777a76]">최근 7일 내 등록된 변화가 없습니다.</p>}
            {recentUpdates.map((update, index) => <article key={update.id} className={`flex items-center gap-4 px-5 py-5 sm:px-7 ${index !== recentUpdates.length - 1 ? "border-b border-black/7" : ""}`}><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${update.importance === 3 ? "bg-rose-500" : "bg-orange-400"}`} /><div className="min-w-0 flex-1">{update.projectId ? <Link className="font-semibold tracking-[-0.025em] underline-offset-4 hover:underline" href={`/projects/${update.projectId}`}>{update.district}</Link> : <h3 className="font-semibold tracking-[-0.025em]">{update.district}</h3>}<p className="mt-1 text-sm text-[#777a76]">{update.title}</p></div><time className="shrink-0 text-sm text-[#777a76]">{update.date}</time></article>)}
          </div>
        </section>
      </div>
    </main>
  );
}
