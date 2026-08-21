"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import NewsSection from "@/components/NewsSection";
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
  const [recentUpdates, setRecentUpdates] = useState<RecentUpdate[]>([]);
  const [summaryStats, setSummaryStats] = useState(emptyStats);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Address Diagnosis State (메인 전면 진단기)
  const [addressInput, setAddressInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);

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

  const handleDiagnose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim()) return;

    setIsSearching(true);
    setDiagnosisResult(null);

    setTimeout(() => {
      const term = addressInput.trim().replaceAll(/\s+/g, "").toLowerCase();

      let matched: { id: string; name: string; district: string; stage: string } | null = null;
      for (const item of Object.values(ADDRESS_MATCH_DB)) {
        if (item.keywords.some((k) => term.includes(k.replaceAll(/\s+/g, "").toLowerCase()) || k.replaceAll(/\s+/g, "").toLowerCase().includes(term))) {
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
          message: `입력하신 주소는 [${matched.name}] 공식 정비구역 도면 내에 포함되어 있습니다!`,
          tip: "현재 단계와 예상 분담금 및 안전마진 시뮬레이터를 확인하여 조합원 매물 가치를 분석하세요.",
        });
      } else if (term.includes("마포") || term.includes("용산") || term.includes("성동") || term.includes("강남") || term.includes("서초") || term.includes("동작")) {
        setDiagnosisResult({
          status: "NEARBY",
          message: "입력하신 주소는 공식 정비구역 경계선 인접 지역(반경 200~300m)으로 추정됩니다.",
          tip: "인근 구역의 재개발 진행에 따른 지가 상승 수혜 또는 모아타운/신통기획 후보지 추진 여부를 체크해 보세요.",
        });
      } else {
        setDiagnosisResult({
          status: "NOT_INCLUDED",
          message: "입력하신 주소는 현재 서울시 주요 정비사업 고시 구역에 편입되어 있지 않습니다.",
          tip: "노후도 충족 시 역세권 활성화 사업, 모아주택, 또는 공공재개발 동의서 징구 현황을 확인하실 수 있습니다.",
        });
      }

      setIsSearching(false);
    }, 400);
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
              서울시 공공 도면 연동
            </span>
          </div>
          <h1 className="max-w-3xl text-4xl font-extrabold tracking-[-0.055em] sm:text-6xl text-[#171918]">
            내 빌라·토지,<br />
            <span className="text-emerald-700">재개발 구역</span>에 들어갈까?
          </h1>
          <p className="mt-4 max-w-xl text-sm sm:text-base text-[#666] leading-relaxed">
            지번이나 주소만 입력하시면 서울시 공식 정비구역 고시 도면과 1초 만에 대조하여 <strong>편입 여부, 추진 단계, 예상 분담금</strong>을 즉시 진단해 드립니다.
          </p>

          {/* Frontpage 1-Second Area Diagnostic Widget */}
          <div className="mt-8 max-w-2xl">
            <form onSubmit={handleDiagnose} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="예: 마포구 도화동 16-1, 한남동 686, 압구정동 369"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                className="flex-1 rounded-2xl border border-black/15 bg-white px-5 py-4 text-sm text-[#171918] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-[0_8px_30px_rgb(0,0,0,0.04)] font-medium"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="rounded-2xl bg-[#171918] text-white px-7 py-4 text-sm font-bold hover:bg-black/80 transition shadow-sm cursor-pointer shrink-0 disabled:opacity-50"
              >
                {isSearching ? "도면 대조 중..." : "1초 진단하기 ➔"}
              </button>
            </form>

            {/* Quick Preset Buttons */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
              <span>빠른 진단:</span>
              {["도화동 16-1", "한남동 686", "압구정동 369", "성수동1가 72", "노량진동 278", "흑석동 90"].map((addr) => (
                <button
                  key={addr}
                  type="button"
                  onClick={() => setAddressInput(addr)}
                  className="rounded-lg bg-white border border-black/8 px-2 py-0.5 text-[11px] font-semibold text-[#171918] hover:bg-emerald-50 hover:text-emerald-700 transition shadow-2xs"
                >
                  {addr}
                </button>
              ))}
            </div>

            {/* Diagnosis Result Box */}
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
                    {diagnosisResult.status === "INCLUDED" ? "정비구역 편입 확인" : diagnosisResult.status === "NEARBY" ? "정비구역 인접" : "정비구역 미편입"}
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
          </div>

          {/* District Shortcut Badges */}
          <div className="mt-10 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-[#777a76]">주요 권역 바로가기:</span>
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
