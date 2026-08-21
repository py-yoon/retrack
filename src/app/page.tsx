"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import NewsSection from "@/components/NewsSection";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isPureChosung, matchHangulSearch } from "@/lib/utils/hangul";
import BuildingLedgerCard from "@/components/BuildingLedgerCard";
import { getBuildingLedgerInfo, type BuildingLedgerInfo } from "@/lib/data/building-ledger";

type RecentUpdate = {
  id: string;
  projectId: string | null;
  projectName: string;
  district: string | null;
  title: string;
  date: string;
  importance: number;
};

type SearchResultItem = {
  id: string;
  name: string;
  address: string;
  district: string | null;
  project_type: string | null;
  current_status: string | null;
};

type DiagnosisResult = {
  status: "INCLUDED" | "NEARBY" | "NOT_INCLUDED";
  projectName?: string;
  projectId?: string;
  district?: string;
  stage?: string;
  message: string;
  tip: string;
};

const ADDRESS_MATCH_DB: Record<string, { id: string; name: string; district: string; stage: string; keywords: string[] }> = {
  "마포로1-24": { id: "cb005e1e-cad8-4c15-bd80-e6ce42a7a400", name: "마포로1-24도시환경정비지구", district: "마포구", stage: "사업시행인가", keywords: ["도화동 16", "도화동 16-1", "도화동", "마포로1", "마포로"] },
  "한남3": { id: "hannam-3", name: "한남3재정비촉진구역", district: "용산구", stage: "관리처분인가", keywords: ["한남동 686", "한남동 700", "보광로 60", "한남3"] },
  "한남2": { id: "hannam-2", name: "한남2재정비촉진구역", district: "용산구", stage: "사업시행인가", keywords: ["보광동 272", "보광동 260", "보광동", "한남2"] },
  "압구정3": { id: "apgujeong-3", name: "압구정3구역 (현대1~7차)", district: "강남구", stage: "조합설립인가", keywords: ["압구정동 369", "압구정로 29", "현대아파트", "압구정3"] },
  "압구정2": { id: "apgujeong-2", name: "압구정2구역 (신현대)", district: "강남구", stage: "조합설립인가", keywords: ["압구정동 426", "신현대", "압구정2"] },
  "성수1": { id: "seongsu-1", name: "성수전략정비구역 1지구", district: "성동구", stage: "조합설립인가", keywords: ["성수동1가 72", "성수동1가", "성수1"] },
  "성수2": { id: "seongsu-2", name: "성수전략정비구역 2지구", district: "성동구", stage: "조합설립인가", keywords: ["성수동2가 506", "성수동2가", "성수2"] },
  "노량진1": { id: "noryangjin-1", name: "노량진1재정비촉진구역", district: "동작구", stage: "사업시행인가", keywords: ["노량진동 278", "노량진로 10", "노량진1"] },
  "흑석9": { id: "heukseok-9", name: "흑석9재정비촉진구역", district: "동작구", stage: "착공", keywords: ["흑석동 90", "서달로", "흑석9"] },
  "반포124": { id: "banpo-124", name: "반포주공1단지 (1·2·4주구)", district: "서초구", stage: "착공", keywords: ["반포동 810", "신반포로 32", "반포주공"] },
  "잠실5": { id: "jamsil-5", name: "잠실주공5단지", district: "송파구", stage: "사업시행인가", keywords: ["잠실동 27", "송파대로 567", "잠실5"] },
  "은마": { id: "daechi-eunma", name: "대치 은마아파트", district: "강남구", stage: "조합설립인가", keywords: ["대치동 316", "삼성로 212", "은마"] },
  "이문1": { id: "imun-1", name: "이문1재정비촉진구역", district: "동대문구", stage: "착공", keywords: ["이문동 257", "이문로", "이문1"] },
  "갈현1": { id: "galhyeon-1", name: "갈현1구역", district: "은평구", stage: "관리처분인가", keywords: ["갈현동 300", "갈현로", "갈현1"] },
};

const emptyStats = [
  { label: "주요 인가/고시", count: 0, color: "bg-rose-500", link: "/changes?importance=3" },
  { label: "일반 공고/열람", count: 0, color: "bg-orange-400", link: "/changes?importance=2" },
  { label: "전체 변화 기록", count: 0, color: "bg-emerald-500", link: "/changes" },
];

const POPULAR_DISTRICTS = ["강남구", "서초구", "송파구", "용산구", "성동구", "마포구", "영등포구", "동작구"];

function formatDate(date: string) {
  return date.replaceAll("-", ".");
}

export default function Home() {
  const router = useRouter();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [recentUpdates, setRecentUpdates] = useState<RecentUpdate[]>([]);
  const [summaryStats, setSummaryStats] = useState(emptyStats);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Search & Diagnosis State
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [buildingLedger, setBuildingLedger] = useState<BuildingLedgerInfo | null>(null);

  // Load Dashboard
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
        // Fallback
      } finally {
        setDashboardLoading(false);
      }
    }
    loadDashboard();
  }, []);

  // Real-time Search by Name / Chosung / Lot / District
  useEffect(() => {
    const term = searchInput.trim();
    if (!term) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSelectedIndex(-1);

      try {
        const supabase = getSupabaseClient();

        // 1. Chosung Search
        if (isPureChosung(term)) {
          const { data } = await supabase
            .from("projects")
            .select("id,name,address,district,project_type,current_status")
            .limit(300);

          const matched = (data ?? [])
            .filter((p) => matchHangulSearch(p.name, term) || matchHangulSearch(p.address, term))
            .slice(0, 10);

          setSearchResults(matched);
          setIsDropdownOpen(matched.length > 0);
        } else {
          // 2. Keyword & Address & Name Search
          const cleanTerm = term.replaceAll("번지", "").replaceAll("일대", "").trim();
          const tokens = cleanTerm.split(/\s+/).filter(Boolean);

          if (tokens.length >= 2) {
            const [t1, t2] = tokens;
            const { data } = await supabase
              .from("projects")
              .select("id,name,address,district,project_type,current_status")
              .or(`address.ilike.%${t1}%${t2}%,name.ilike.%${t1}%${t2}%,and(address.ilike.%${t1}%,address.ilike.%${t2}%),and(name.ilike.%${t1}%,name.ilike.%${t2}%)`)
              .limit(10);

            // Also check fallback address DB
            const fallbackMatches = Object.values(ADDRESS_MATCH_DB)
              .filter((item) => item.keywords.some((k) => k.includes(t1) || k.includes(t2)))
              .map((item) => ({
                id: item.id,
                name: item.name,
                address: item.district,
                district: item.district,
                project_type: "정비사업",
                current_status: item.stage,
              }));

            const combined = [...(data ?? []), ...fallbackMatches];
            
            // Smart Deduplication & Relevance Ranking
            const seenNames = new Set<string>();
            const uniqueResults: SearchResultItem[] = [];

            // Sort: exact matches first, then partial matches
            combined.sort((a, b) => {
              const aName = a.name.replaceAll(/\s+/g, "").toLowerCase();
              const bName = b.name.replaceAll(/\s+/g, "").toLowerCase();
              const cleanT = term.replaceAll(/\s+/g, "").toLowerCase();

              const aExact = aName === cleanT || aName.startsWith(cleanT);
              const bExact = bName === cleanT || bName.startsWith(cleanT);

              if (aExact && !bExact) return -1;
              if (!aExact && bExact) return 1;
              return 0;
            });

            for (const item of combined) {
              const normName = item.name.replaceAll(/\s+/g, "").replaceAll("주택재개발", "").replaceAll("정비사업", "").replaceAll("재정비촉진구역", "구역");
              if (!seenNames.has(normName)) {
                seenNames.add(normName);
                uniqueResults.push(item);
              }
              if (uniqueResults.length >= 8) break;
            }

            setSearchResults(uniqueResults);
            setIsDropdownOpen(uniqueResults.length > 0);
          }
        }
      } catch {
        // Fallback local match with deduplication
        const localMatches = Object.values(ADDRESS_MATCH_DB)
          .filter((item) => item.name.includes(term) || item.keywords.some((k) => k.includes(term)))
          .map((item) => ({
            id: item.id,
            name: item.name,
            address: item.district,
            district: item.district,
            project_type: "정비사업",
            current_status: item.stage,
          }));

        const seen = new Set<string>();
        const dedupLocal = localMatches.filter((item) => {
          const norm = item.name.replaceAll(/\s+/g, "");
          if (seen.has(norm)) return false;
          seen.add(norm);
          return true;
        });

        setSearchResults(dedupLocal);
        setIsDropdownOpen(dedupLocal.length > 0);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (searchResults.length > 0 ? (prev + 1) % searchResults.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (searchResults.length > 0 ? (prev - 1 + searchResults.length) % searchResults.length : -1));
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
    }
  };

  // Submit handler (Enter or Button click)
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (selectedIndex >= 0 && searchResults[selectedIndex]) {
      router.push(`/projects/${searchResults[selectedIndex].id}`);
      return;
    }

    if (searchResults.length === 1) {
      router.push(`/projects/${searchResults[0].id}`);
      return;
    }

    // Run Address Diagnosis
    runDiagnosis(searchInput);
  };

  const runDiagnosis = (text: string) => {
    if (!text.trim()) return;
    setIsDropdownOpen(false);
    setDiagnosisResult(null);
    setBuildingLedger(null);

    const term = text.trim().replaceAll(/\s+/g, "").toLowerCase();

    // 1. Fetch Official Building Ledger Info
    const ledger = getBuildingLedgerInfo(text);
    if (ledger) {
      setBuildingLedger(ledger);
    }

    let matched: { id: string; name: string; district: string; stage: string } | null = null;
    for (const item of Object.values(ADDRESS_MATCH_DB)) {
      if (
        item.name.replaceAll(/\s+/g, "").toLowerCase().includes(term) ||
        item.keywords.some((k) => term.includes(k.replaceAll(/\s+/g, "").toLowerCase()) || k.replaceAll(/\s+/g, "").toLowerCase().includes(term))
      ) {
        matched = item;
        break;
      }
    }

    if (matched) {
      setDiagnosisResult({
        status: "INCLUDED",
        projectName: matched.name,
        projectId: matched.id,
        district: matched.district,
        stage: matched.stage,
        message: `[${matched.name}] 공식 정비구역 도면 및 사업지 정보가 확인되었습니다!`,
        tip: "현재 추진 단계, 실측 네이버 지도, 예상 분담금 및 안전마진 시뮬레이터를 확인하세요.",
      });
    } else if (term.includes("마포") || term.includes("용산") || term.includes("성동") || term.includes("강남") || term.includes("서초") || term.includes("동작")) {
      setDiagnosisResult({
        status: "NEARBY",
        message: "입력하신 지역은 공식 정비구역 인접 지역(반경 200~300m)으로 추정됩니다.",
        tip: "인근 구역의 재개발 진행에 따른 지가 상승 수혜 또는 모아타운/신통기획 후보지 추진 여부를 체크해 보세요.",
      });
    } else {
      setDiagnosisResult({
        status: "NOT_INCLUDED",
        message: "입력하신 구역명/지번은 현재 서울시 주요 정비사업 고시 구역에 편입되어 있지 않습니다.",
        tip: "노후도 충족 시 역세권 활성화 사업, 모아주택, 또는 공공재개발 동의서 징구 현황을 확인하실 수 있습니다.",
      });
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#171918]">
      <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10 sm:py-14">
        <Header />

        {/* Hero Section */}
        <section className="pt-14 sm:pt-20">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold tracking-[0.12em] text-[#e6523a]">URBAN RENEWAL INTELLIGENCE</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
              서울시 600개 구역 연동
            </span>
          </div>
          <h1 className="max-w-3xl text-4xl font-extrabold tracking-[-0.055em] sm:text-6xl text-[#171918]">
            서울 재개발·재건축,<br />
            <span className="text-emerald-700">구역명 & 지번</span>으로 바로 찾기
          </h1>
          <p className="mt-4 max-w-xl text-sm sm:text-base text-[#666] leading-relaxed">
            구역 이름(예: <strong>마포로, 한남3, 압구정</strong>)이나 지번(예: <strong>도화동 16-1</strong>)을 입력하시면 <strong>실시간 구역 목록과 1초 정비구역 진단</strong>을 즉시 제공합니다.
          </p>

          {/* Universal Search & Diagnostic Input Container */}
          <div ref={searchContainerRef} className="relative mt-8 max-w-2xl">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="구역명, 초성(ㅁㅍㄹ, ㅎㄴ), 지번(도화동 16-1) 입력"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setIsDropdownOpen(true);
                  }}
                  onKeyDown={handleKeyDown}
                  className="w-full rounded-2xl border border-black/15 bg-white px-5 py-4 text-sm text-[#171918] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-[0_8px_30px_rgb(0,0,0,0.04)] font-medium"
                />
                {isSearching && (
                  <div className="absolute right-4 top-4 text-xs text-gray-400 animate-spin">
                    ⏳
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="rounded-2xl bg-[#171918] text-white px-7 py-4 text-sm font-bold hover:bg-black/80 transition shadow-sm cursor-pointer shrink-0"
              >
                검색 & 진단 ➔
              </button>
            </form>

            {/* Real-time Autocomplete Dropdown List */}
            {isDropdownOpen && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-black/10 bg-white p-2 shadow-xl animate-fade-in">
                <div className="px-3 py-1.5 text-[11px] font-bold text-gray-400 border-b border-black/5 flex justify-between">
                  <span>검색된 정비사업 구역 ({searchResults.length}건)</span>
                  <span>클릭 시 상세 이동 ↗</span>
                </div>
                <div className="divide-y divide-black/5">
                  {searchResults.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        router.push(`/projects/${item.id}`);
                      }}
                      className={`w-full text-left p-3 rounded-xl transition flex items-center justify-between gap-2 cursor-pointer ${
                        selectedIndex === index ? "bg-emerald-50 text-emerald-950" : "hover:bg-gray-50 text-[#171918]"
                      }`}
                    >
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {item.district ?? "서울"}
                          </span>
                          <span className="font-bold text-sm text-[#171918] truncate">
                            {item.name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {item.address}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 block">
                          {item.current_status ?? "진행 중"}
                        </span>
                        <span className="text-[10px] text-gray-400 mt-0.5 block">
                          {item.project_type ?? "정비사업"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Preset Buttons */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
              <span>인기 구역:</span>
              {[
                { name: "마포로1-24", query: "마포로" },
                { name: "한남3구역", query: "한남3" },
                { name: "압구정3구역", query: "압구정" },
                { name: "성수전략1지구", query: "성수" },
                { name: "노량진1구역", query: "노량진" },
                { name: "흑석9구역", query: "흑석" },
                { name: "대치 은마", query: "은마" },
              ].map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
                    setSearchInput(item.query);
                  }}
                  className="rounded-lg bg-white border border-black/8 px-2 py-0.5 text-[11px] font-semibold text-[#171918] hover:bg-emerald-50 hover:text-emerald-700 transition shadow-2xs cursor-pointer"
                >
                  {item.name}
                </button>
              ))}
            </div>

            {/* Diagnosis Result Box (if triggered) */}
            {diagnosisResult && (
              <div className={`mt-6 rounded-3xl border p-6 shadow-sm transition-all ${
                diagnosisResult.status === "INCLUDED"
                  ? "bg-emerald-50/80 border-emerald-300"
                  : diagnosisResult.status === "NEARBY"
                  ? "bg-amber-50/80 border-amber-300"
                  : "bg-white border-black/10"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">
                    {diagnosisResult.status === "INCLUDED" ? "🎉" : diagnosisResult.status === "NEARBY" ? "📍" : "⚪"}
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    diagnosisResult.status === "INCLUDED"
                      ? "bg-emerald-600 text-white"
                      : diagnosisResult.status === "NEARBY"
                      ? "bg-amber-600 text-white"
                      : "bg-gray-600 text-white"
                  }`}>
                    {diagnosisResult.status === "INCLUDED" ? "정비구역 확인" : diagnosisResult.status === "NEARBY" ? "정비구역 인접" : "정비구역 미편입"}
                  </span>
                </div>

                <h2 className="text-base sm:text-lg font-bold text-[#171918] mt-1">
                  {diagnosisResult.message}
                </h2>

                {diagnosisResult.status === "INCLUDED" && diagnosisResult.projectName && (
                  <div className="mt-4 p-4 rounded-2xl bg-white border border-emerald-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500">{diagnosisResult.district}</span>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {diagnosisResult.stage}
                        </span>
                      </div>
                      <p className="text-base font-bold text-[#171918] mt-1">{diagnosisResult.projectName}</p>
                    </div>
                    <Link
                      href={`/projects/${diagnosisResult.projectId}`}
                      className="rounded-xl bg-emerald-700 text-white px-4 py-2 text-xs font-bold hover:bg-emerald-800 transition shadow-xs"
                    >
                      네이버 지도 & 분담금 계산기 보기 ➔
                    </Link>
                  </div>
                )}

                <p className="mt-3 text-xs text-gray-600 border-t border-black/5 pt-2 leading-relaxed">
                  💡 <strong>투자 가이드</strong>: {diagnosisResult.tip}
                </p>
              </div>
            )}

            {/* Building Ledger Card */}
            {buildingLedger && (
              <div className="mt-4">
                <BuildingLedgerCard ledger={buildingLedger} />
              </div>
            )}
          </div>

          {/* District Shortcut Badges */}
          <div className="mt-10 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-[#777a76]">주요 자치구:</span>
            {POPULAR_DISTRICTS.map((district) => (
              <Link
                key={district}
                href={`/changes?district=${encodeURIComponent(district)}`}
                className="rounded-xl border border-black/8 bg-white px-3 py-1.5 font-bold text-[#171918] transition hover:bg-[#171918] hover:text-white shadow-2xs"
              >
                {district}
              </Link>
            ))}
            <Link
              href="/map"
              className="rounded-xl border border-emerald-600/30 bg-emerald-50 px-3 py-1.5 font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
            >
              🗺️ 서울 전체 정비지도 보기 ➔
            </Link>
          </div>
        </section>

        {/* Dashboard Stats */}
        <section className="mt-14">
          <div className="grid gap-3 sm:grid-cols-3">
            {summaryStats.map((stat) => (
              <Link
                key={stat.label}
                href={stat.link}
                className="group rounded-2xl border border-black/8 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center gap-2 text-xs text-[#777a76]">
                  <span className={`h-2 w-2 rounded-full ${stat.color}`} />
                  <span>{stat.label}</span>
                </div>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-[#171918]">
                  {dashboardLoading ? "-" : `${stat.count}건`}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Real-time Renewal News */}
        <NewsSection />

        {/* Recent Timeline Feed */}
        <section className="mt-12">
          <div className="flex items-center justify-between border-b border-black/10 pb-4">
            <h2 className="text-xl font-bold tracking-tight text-[#171918]">최근 인허가 & 고시 변화</h2>
            <Link className="text-xs font-bold text-emerald-700 hover:underline" href="/changes">
              전체 변화 피드 보기 ➔
            </Link>
          </div>

          <div className="mt-4 divide-y divide-black/5">
            {recentUpdates.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {item.district ?? "서울시"}
                  </span>
                  {item.projectId ? (
                    <Link
                      href={`/projects/${item.projectId}`}
                      className="text-sm font-bold text-[#171918] hover:text-emerald-700 transition"
                    >
                      {item.title}
                    </Link>
                  ) : (
                    <span className="text-sm font-bold text-[#171918]">{item.title}</span>
                  )}
                </div>
                <span className="text-xs font-mono text-gray-400 shrink-0">{item.date}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
