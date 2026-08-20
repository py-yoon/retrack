"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isPureChosung, matchHangulSearch } from "@/lib/utils/hangul";

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
  project_type: string | null;
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
  const router = useRouter();
  const [recentUpdates, setRecentUpdates] = useState<RecentUpdate[]>([]);
  const [summaryStats, setSummaryStats] = useState(emptyStats);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isInputFocused, setIsInputFocused] = useState(false);

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

  const [searchMode, setSearchMode] = useState<"all" | "address">("all");

  // Debounced search logic with Chosung and multi-token matching (supporting lot number / address reverse lookup)
  useEffect(() => {
    const term = query.trim();
    if (!term) return;

    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError("");
      setSelectedIndex(-1);

      try {
        const supabase = getSupabaseClient();

        if (isPureChosung(term)) {
          // 초성 검색인 경우 상위 사업장 목록을 가져와 클라이언트 초성 매칭 실행
          const { data, error } = await supabase
            .from("projects")
            .select("id,name,address,district,project_type,current_status")
            .limit(500);

          if (error) throw error;

          const matched = (data ?? [])
            .filter((p) => matchHangulSearch(p.name, term) || matchHangulSearch(p.address, term))
            .slice(0, 12);

          setResults(matched);
        } else {
          // 지번 / 주소 및 일반 키워드 분해
          // 예: "대치동 66", "신당동 321", "한남동 686", "전농동 440-9"
          const cleanTerm = term.replaceAll("번지", "").replaceAll("일대", "").replaceAll("일원", "").trim();
          const tokens = cleanTerm.split(/\s+/).filter(Boolean);

          if (tokens.length >= 2) {
            const [t1, t2] = tokens;
            // 지번 + 동명 복합 검색 (address와 name에서 동시 검색)
            const { data, error } = await supabase
              .from("projects")
              .select("id,name,address,district,project_type,current_status")
              .or(`address.ilike.%${t1}%${t2}%,address.ilike.%${t2}%${t1}%,name.ilike.%${t1}%${t2}%,and(address.ilike.%${t1}%,address.ilike.%${t2}%),and(name.ilike.%${t1}%,name.ilike.%${t2}%),and(district.ilike.%${t1}%,address.ilike.%${t2}%)`)
              .limit(15);

            if (error) throw error;
            setResults(data ?? []);
          } else {
            // 단일 키워드 (동 이름 or 지번 or 단지명)
            const { data, error } = await supabase
              .from("projects")
              .select("id,name,address,district,project_type,current_status")
              .or(`name.ilike.%${term}%,address.ilike.%${term}%,district.ilike.%${term}%`)
              .limit(15);

            if (error) throw error;
            setResults(data ?? []);
          }
        }
      } catch {
        setSearchError("검색 중 문제가 발생했습니다. Supabase 연결 설정을 확인해 주세요.");
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : -1));
    } else if (e.key === "Escape") {
      setResults([]);
      setIsInputFocused(false);
    }
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedIndex >= 0 && results[selectedIndex]) {
      router.push(`/projects/${results[selectedIndex].id}`);
    } else if (results.length === 1) {
      router.push(`/projects/${results[0].id}`);
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

          {/* Search Mode Switcher Tabs */}
          <div className="mt-8 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSearchMode("all");
                setQuery("");
                setResults([]);
              }}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                searchMode === "all"
                  ? "bg-[#171918] text-white shadow-sm"
                  : "bg-white text-[#666] border border-black/8 hover:bg-[#f7f7f4]"
              }`}
            >
              🔍 전체 (단지명 / 초성)
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchMode("address");
                setQuery("신당동 321");
              }}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                searchMode === "address"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50"
              }`}
            >
              <span>📍 지번·주소로 구역 찾기</span>
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] text-emerald-900 font-bold">New</span>
            </button>
          </div>

          <div className="relative mt-3 max-w-2xl">
            <form onSubmit={handleSearchSubmit}>
              <label
                className={`flex h-16 items-center gap-4 rounded-2xl border bg-white px-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition ${
                  searchMode === "address"
                    ? "border-emerald-500 ring-2 ring-emerald-100"
                    : "border-black/10 focus-within:border-black/30"
                }`}
                htmlFor="project-search"
              >
                <span className="text-lg">
                  {searchMode === "address" ? "📍" : "🔍"}
                </span>
                <input
                  id="project-search"
                  className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#989b96]"
                  placeholder={
                    searchMode === "address"
                      ? "동 이름과 지번을 입력하세요 (예: 신당동 321, 대치동 66, 한남동 686)"
                      : "사업장명, 초성(예: ㅎㄴ, ㄷㅊ), 지번주소, 자치구 검색"
                  }
                  type="search"
                  value={query}
                  autoComplete="off"
                  onFocus={() => setIsInputFocused(true)}
                  onChange={(event) => {
                    const val = event.target.value;
                    setQuery(val);
                    if (!val.trim()) {
                      setResults([]);
                      setSearchError("");
                      setSearching(false);
                      setSelectedIndex(-1);
                    }
                  }}
                  onKeyDown={handleKeyDown}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setResults([]);
                    }}
                    className="text-[#989b96] hover:text-[#171918]"
                    aria-label="검색어 지우기"
                  >
                    ✕
                  </button>
                )}
                <kbd className="hidden rounded border border-black/10 px-2 py-1 text-xs text-[#777a76] sm:block">
                  Enter
                </kbd>
              </label>
            </form>

            {/* Quick Example Chips for Lot Number Lookup */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-[#777a76]">
              <span className="font-semibold text-[#171918]">추천 지번 검색:</span>
              {[
                { label: "📍 대치동 66", term: "대치동 66" },
                { label: "📍 신당동 321", term: "신당동 321" },
                { label: "📍 전농동 440-9", term: "전농동 440-9" },
                { label: "📍 길동 298", term: "길동 298" },
                { label: "📍 하왕십리동 890", term: "하왕십리동 890" },
              ].map((chip) => (
                <button
                  key={chip.term}
                  type="button"
                  onClick={() => {
                    setSearchMode("address");
                    setQuery(chip.term);
                  }}
                  className="rounded-lg bg-white border border-black/8 px-2 py-1 text-[11px] font-medium text-[#555] transition hover:border-black/20 hover:bg-[#f7f7f4]"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {searching && (
              <p className="mt-2 text-xs text-[#777a76] animate-pulse">실시간 검색 중...</p>
            )}
            {searchError && <p className="mt-2 text-xs text-rose-600">{searchError}</p>}
            {!searching && query.trim() && !searchError && results.length === 0 && (
              <p className="mt-2 text-xs text-[#777a76]">일치하는 사업장 결과가 없습니다.</p>
            )}

            {/* Live Autocomplete Results */}
            {results.length > 0 && isInputFocused && (
              <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-black/8 bg-white shadow-[0_12px_40px_rgb(0,0,0,0.08)]">
                {results.map((project, idx) => (
                  <Link
                    className={`block border-b border-black/5 px-5 py-3.5 transition last:border-0 ${
                      idx === selectedIndex ? "bg-[#f2f2ee]" : "hover:bg-[#f7f7f4]"
                    }`}
                    href={`/projects/${project.id}`}
                    key={project.id}
                    onClick={() => setIsInputFocused(false)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {searchMode === "address" ? (
                          <span className="shrink-0 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                            📍 해당 지번 구역
                          </span>
                        ) : (
                          project.district && (
                            <span className="shrink-0 rounded bg-black/5 px-1.5 py-0.5 text-xs font-semibold text-[#171918]">
                              {project.district}
                            </span>
                          )
                        )}
                        <p className="truncate font-bold text-[#171918]">{project.name}</p>
                      </div>
                      {project.current_status && (
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          {project.current_status}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-[#777a76]">
                      <p className={`truncate ${searchMode === "address" ? "font-semibold text-emerald-950" : ""}`}>
                        {searchMode === "address" ? `📍 구역 지번: ${project.address}` : project.address}
                      </p>
                      {project.project_type && (
                        <span className="shrink-0 text-[#989b96] ml-2">{project.project_type}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

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

