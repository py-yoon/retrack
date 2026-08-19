"use client";

import { Suspense, useEffect, useState, useCallback, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { getSupabaseClient } from "@/lib/supabase/client";

const SEOUL_DISTRICTS = [
  "강남구", "강동구", "강북구", "강서구", "관악구",
  "광진구", "구로구", "금천구", "노원구", "도봉구",
  "동대문구", "동작구", "마포구", "서대문구", "서초구",
  "성동구", "성북구", "송파구", "양천구", "영등포구",
  "용산구", "은평구", "종로구", "중구", "중랑구"
];

const COMMON_PROJECT_TYPES = [
  "재개발사업지구",
  "주택재개발사업지구",
  "도시환경정비사업지구",
  "주택재건축사업",
  "주택재개발사업구역",
  "도시환경정비사업구역",
  "재건축사업구역",
  "주거환경개선사업",
  "도시정비형재개발사업지구"
];

const COMMON_STAGES = [
  "정비계획 수립",
  "정비구역",
  "조합설립인가",
  "사업시행인가",
  "관리처분인가",
  "착공",
  "준공인가",
  "조합해산"
];

type EventRow = {
  id: string;
  project_id: string;
  title: string;
  event_type: string;
  importance: number;
  occurred_at: string;
  source_name: string | null;
  source_url: string | null;
  project: {
    name: string;
    address: string;
    district: string | null;
    project_type: string | null;
    current_status: string | null;
  } | null;
};

type Period = "today" | "7d" | "30d" | "all" | "custom";

function seoulDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

function formatDate(date: string) {
  return date.replaceAll("-", ".");
}

function ChangesContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Read initial states from URL search params
  const initialPeriod = (searchParams.get("period") as Period) || "7d";
  const initialDistrict = searchParams.get("district") || "all";
  const initialImportance = searchParams.get("importance") || "all";
  const initialEventType = searchParams.get("event_type") || "all";
  const initialProjectType = searchParams.get("project_type") || "all";
  const initialStage = searchParams.get("stage") || "all";
  const initialPage = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const initialStartDate = searchParams.get("start_date") || "";
  const initialEndDate = searchParams.get("end_date") || "";

  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [customStartDate, setCustomStartDate] = useState(initialStartDate);
  const [customEndDate, setCustomEndDate] = useState(initialEndDate);
  const [district, setDistrict] = useState(initialDistrict);
  const [importance, setImportance] = useState(initialImportance);
  const [eventType, setEventType] = useState(initialEventType);
  const [projectType, setProjectType] = useState(initialProjectType);
  const [stage, setStage] = useState(initialStage);
  const [page, setPage] = useState(initialPage);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const pageSize = 20;

  // Sync state changes to URL
  const updateUrl = useCallback(
    (params: Record<string, string | number | undefined>) => {
      const current = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, value]) => {
        if (!value || value === "all" || (key === "page" && value === 1)) {
          current.delete(key);
        } else {
          current.set(key, String(value));
        }
      });
      const query = current.toString();
      const url = query ? `${pathname}?${query}` : pathname;
      startTransition(() => {
        router.replace(url, { scroll: false });
      });
    },
    [pathname, router, searchParams]
  );

  // Fetch events with server-side DB filtering & pagination
  useEffect(() => {
    let isCancelled = false;

    async function loadEvents() {
      setLoading(true);
      setError("");

      try {
        const supabase = getSupabaseClient();
        const today = seoulDate();

        // Build Supabase Query
        let query = supabase
          .from("events")
          .select(
            "id,project_id,title,event_type,importance,occurred_at,source_name,source_url,project:projects!inner(name,address,district,project_type,current_status)",
            { count: "exact" }
          );

        // Date range filter
        if (period === "today") {
          query = query.eq("occurred_at", today);
        } else if (period === "7d") {
          query = query.gte("occurred_at", seoulDate(-6)).lte("occurred_at", today);
        } else if (period === "30d") {
          query = query.gte("occurred_at", seoulDate(-29)).lte("occurred_at", today);
        } else if (period === "custom") {
          if (customStartDate) query = query.gte("occurred_at", customStartDate);
          if (customEndDate) query = query.lte("occurred_at", customEndDate);
        }

        // District filter
        if (district !== "all") {
          query = query.eq("project.district", district);
        }

        // Importance filter
        if (importance !== "all") {
          query = query.eq("importance", Number(importance));
        }

        // Event Type filter
        if (eventType !== "all") {
          query = query.eq("event_type", eventType);
        }

        // Project Type filter
        if (projectType !== "all") {
          query = query.eq("project.project_type", projectType);
        }

        // Stage filter
        if (stage !== "all") {
          query = query.eq("project.current_status", stage);
        }

        // Order & Pagination
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.order("occurred_at", { ascending: false }).range(from, to);

        const { data, count, error: queryError } = await query;

        if (isCancelled) return;
        if (queryError) throw queryError;

        setEvents((data as unknown as EventRow[]) ?? []);
        setTotalCount(count ?? 0);
      } catch {
        if (!isCancelled) {
          setError("변화 데이터를 불러오지 못했습니다. Supabase 연결 설정을 확인해 주세요.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadEvents();

    return () => {
      isCancelled = true;
    };
  }, [
    period,
    customStartDate,
    customEndDate,
    district,
    importance,
    eventType,
    projectType,
    stage,
    page
  ]);

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  function handlePeriodChange(newPeriod: Period) {
    setPeriod(newPeriod);
    setPage(1);
    updateUrl({
      period: newPeriod === "7d" ? undefined : newPeriod,
      start_date: newPeriod === "custom" ? customStartDate : undefined,
      end_date: newPeriod === "custom" ? customEndDate : undefined,
      page: 1,
    });
  }

  function handleDistrictChange(newDistrict: string) {
    setDistrict(newDistrict);
    setPage(1);
    updateUrl({ district: newDistrict, page: 1 });
  }

  function handleImportanceChange(newImportance: string) {
    setImportance(newImportance);
    setPage(1);
    updateUrl({ importance: newImportance, page: 1 });
  }

  function handleEventTypeChange(newEventType: string) {
    setEventType(newEventType);
    setPage(1);
    updateUrl({ event_type: newEventType, page: 1 });
  }

  function handleProjectTypeChange(newProjectType: string) {
    setProjectType(newProjectType);
    setPage(1);
    updateUrl({ project_type: newProjectType, page: 1 });
  }

  function handleStageChange(newStage: string) {
    setStage(newStage);
    setPage(1);
    updateUrl({ stage: newStage, page: 1 });
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    updateUrl({ page: newPage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleResetFilters() {
    setPeriod("7d");
    setCustomStartDate("");
    setCustomEndDate("");
    setDistrict("all");
    setImportance("all");
    setEventType("all");
    setProjectType("all");
    setStage("all");
    setPage(1);
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }

  const isFiltered =
    period !== "7d" ||
    district !== "all" ||
    importance !== "all" ||
    eventType !== "all" ||
    projectType !== "all" ||
    stage !== "all" ||
    Boolean(customStartDate) ||
    Boolean(customEndDate);

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#171918]">
      <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10 sm:py-14">
        <Header />

        <section className="pt-14">
          <p className="text-sm font-semibold tracking-[0.12em] text-[#e6523a]">CHANGE FEED</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
            정비사업 변화 전체 보기
          </h1>
          <p className="mt-4 text-[#6e716e]">
            서울 25개 자치구 정비사업장의 공고와 인가·진행단계 변동을 실시간으로 확인하세요.
          </p>
        </section>

        {/* Filter Section */}
        <section className="mt-10 rounded-2xl bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.035)]" aria-label="변화 필터">
          <div className="flex items-center justify-between border-b border-black/5 pb-4 mb-4">
            <span className="text-sm font-semibold tracking-tight text-[#171918]">필터 검색</span>
            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-medium text-[#e6523a] hover:underline"
              >
                필터 초기화
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Autonomous District Filter */}
            <label className="text-sm font-medium">
              자치구
              <select
                className="mt-2 block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:border-black/30 focus:outline-none"
                value={district}
                onChange={(e) => handleDistrictChange(e.target.value)}
              >
                <option value="all">서울시 전체 (25개 구)</option>
                {SEOUL_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            {/* Period Filter */}
            <label className="text-sm font-medium">
              기간
              <select
                className="mt-2 block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:border-black/30 focus:outline-none"
                value={period}
                onChange={(e) => handlePeriodChange(e.target.value as Period)}
              >
                <option value="today">오늘</option>
                <option value="7d">최근 7일</option>
                <option value="30d">최근 30일</option>
                <option value="all">전체 기간</option>
                <option value="custom">직접 기간 선택</option>
              </select>
            </label>

            {/* Importance Filter */}
            <label className="text-sm font-medium">
              중요도
              <select
                className="mt-2 block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:border-black/30 focus:outline-none"
                value={importance}
                onChange={(e) => handleImportanceChange(e.target.value)}
              >
                <option value="all">전체</option>
                <option value="3">중요 (주요 인가/고시)</option>
                <option value="2">일반 (공고/열람)</option>
                <option value="1">낮음</option>
              </select>
            </label>

            {/* Event Type Filter */}
            <label className="text-sm font-medium">
              변화 유형
              <select
                className="mt-2 block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:border-black/30 focus:outline-none"
                value={eventType}
                onChange={(e) => handleEventTypeChange(e.target.value)}
              >
                <option value="all">전체</option>
                <option value="공고">공고</option>
                <option value="인가">인가</option>
                <option value="고시">고시</option>
                <option value="신규">신규</option>
              </select>
            </label>

            {/* Project Type Filter */}
            <label className="text-sm font-medium">
              사업 유형
              <select
                className="mt-2 block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:border-black/30 focus:outline-none"
                value={projectType}
                onChange={(e) => handleProjectTypeChange(e.target.value)}
              >
                <option value="all">전체</option>
                {COMMON_PROJECT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            {/* Stage Filter */}
            <label className="text-sm font-medium">
              현재 단계
              <select
                className="mt-2 block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:border-black/30 focus:outline-none"
                value={stage}
                onChange={(e) => handleStageChange(e.target.value)}
              >
                <option value="all">전체</option>
                {COMMON_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Custom Date Range Inputs */}
          {period === "custom" && (
            <div className="mt-4 pt-4 border-t border-black/5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                시작일
                <input
                  type="date"
                  className="mt-2 block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:border-black/30 focus:outline-none"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value);
                    setPage(1);
                    updateUrl({ start_date: e.target.value, page: 1 });
                  }}
                />
              </label>
              <label className="text-sm font-medium">
                종료일
                <input
                  type="date"
                  className="mt-2 block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:border-black/30 focus:outline-none"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value);
                    setPage(1);
                    updateUrl({ end_date: e.target.value, page: 1 });
                  }}
                />
              </label>
            </div>
          )}
        </section>

        {/* Change List Section */}
        <section className="mt-10 pb-12">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="text-2xl font-semibold tracking-[-0.04em]">변화 목록</h2>
            <span className="text-sm text-[#777a76]">
              {loading ? "불러오는 중..." : `총 ${totalCount.toLocaleString()}건 (${page} / ${pageCount} 페이지)`}
            </span>
          </div>

          {error && (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              {error}
            </p>
          )}

          {loading && (
            <div className="rounded-2xl bg-white px-5 py-12 text-center text-sm text-[#777a76] shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              변화 데이터를 조회 중입니다...
            </div>
          )}

          {!loading && !error && events.length === 0 && (
            <div className="rounded-2xl bg-white px-5 py-12 text-center text-sm text-[#777a76] shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              선택한 조건에 맞는 변화가 없습니다. 필터를 조정해 보세요.
            </div>
          )}

          {!loading && !error && events.length > 0 && (
            <>
              <div className="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                {events.map((event) => (
                  <article
                    className="border-b border-black/7 px-5 py-5 transition hover:bg-[#fcfcfa] last:border-0 sm:px-7"
                    key={event.id}
                  >
                    <div className="flex gap-3.5">
                      <span
                        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                          event.importance === 3 ? "bg-rose-500" : "bg-orange-400"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        {/* Meta Tags */}
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#777a76]">
                          <time className="font-mono">{formatDate(event.occurred_at)}</time>
                          {event.project?.district && (
                            <span className="rounded-md bg-black/5 px-2 py-0.5 font-medium text-[#171918]">
                              {event.project.district}
                            </span>
                          )}
                          <span className="rounded-md bg-black/5 px-2 py-0.5 font-medium text-[#171918]">
                            {event.event_type}
                          </span>
                          {event.project?.current_status && (
                            <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                              {event.project.current_status}
                            </span>
                          )}
                          {event.importance === 3 && (
                            <span className="font-semibold text-rose-600">중요</span>
                          )}
                        </div>

                        {/* Project Name Link */}
                        <Link
                          className="mt-2 block font-semibold leading-6 tracking-tight text-[#171918] underline-offset-4 hover:underline"
                          href={`/projects/${event.project_id}`}
                        >
                          {event.project?.name ?? "서울 정비사업"}
                        </Link>

                        {/* Event Title */}
                        <p className="mt-1 text-sm leading-relaxed text-[#444]">{event.title}</p>

                        {/* Source Proof Link */}
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
                    </div>
                  </article>
                ))}
              </div>

              {/* Pagination Controls */}
              {pageCount > 1 && (
                <nav
                  className="mt-6 flex items-center justify-center gap-3"
                  aria-label="변화 목록 페이지 이동"
                >
                  <button
                    className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium transition hover:bg-[#f7f7f4] disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={page === 1}
                    onClick={() => handlePageChange(page - 1)}
                  >
                    이전
                  </button>
                  <span className="text-sm font-medium text-[#777a76]">
                    {page} / {pageCount}
                  </span>
                  <button
                    className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium transition hover:bg-[#f7f7f4] disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={page === pageCount}
                    onClick={() => handlePageChange(page + 1)}
                  >
                    다음
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

export default function ChangesPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7f7f4] text-[#171918]">
          <div className="mx-auto max-w-5xl px-6 py-14 text-center text-sm text-[#777a76]">
            화면을 준비 중입니다...
          </div>
        </main>
      }
    >
      <ChangesContent />
    </Suspense>
  );
}
