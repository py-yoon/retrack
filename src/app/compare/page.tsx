"use client";

import { useEffect, useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getProjectSpecs, ProjectSpecInfo } from "@/lib/data/project-specs";
import { getNaverMapUrl } from "@/lib/utils/map";

type ProjectSummary = {
  id: string;
  name: string;
  address: string;
  district: string | null;
  project_type: string | null;
  current_status: string | null;
  updated_at: string;
};

type ComparisonData = {
  project: ProjectSummary;
  specs: ProjectSpecInfo;
  stageOrder: number;
  expectedProfit: number;
  expectedRoi: number;
  estimatedContribution: number;
  memberPrice84: number;
};

const PRESET_BATTLES = [
  { label: "⚔️ 노량진 1구역 vs 노량진 3구역", q1: "노량진1", q2: "노량진3" },
  { label: "⚔️ 한남 2구역 vs 한남 3구역", q1: "한남2", q2: "한남3" },
  { label: "⚔️ 성수 1지구 vs 성수 2지구", q1: "성수1", q2: "성수2" },
  { label: "⚔️ 은마아파트 vs 대치쌍용1차", q1: "은마", q2: "대치쌍용1차" },
  { label: "⚔️ 이문 1구역 vs 이문 3구역", q1: "이문1", q2: "이문3" },
  { label: "⚔️ 방배 5구역 vs 방배 6구역", q1: "방배5", q2: "방배6" },
];

const STAGE_ORDER_MAP: Record<string, number> = {
  정비구역: 10,
  정비구역지정: 10,
  "정비계획 수립": 10,
  추진위원회승인: 20,
  조합설립인가: 30,
  사업시행인가: 40,
  관리처분인가: 50,
  철거: 55,
  착공: 60,
  분양: 65,
  준공인가: 70,
  이전고시: 75,
  조합해산: 80,
  조합청산: 85,
};

const DISTRICT_BENCHMARK_84: Record<string, { memberPrice: number; marketPrice: number }> = {
  강남구: { memberPrice: 17.5, marketPrice: 28.0 },
  서초구: { memberPrice: 17.0, marketPrice: 27.0 },
  송파구: { memberPrice: 13.5, marketPrice: 21.0 },
  용산구: { memberPrice: 15.0, marketPrice: 24.0 },
  성동구: { memberPrice: 12.0, marketPrice: 18.0 },
  마포구: { memberPrice: 11.5, marketPrice: 17.5 },
  동작구: { memberPrice: 10.5, marketPrice: 16.0 },
  영등포구: { memberPrice: 10.5, marketPrice: 15.5 },
  양천구: { memberPrice: 10.5, marketPrice: 16.0 },
  광진구: { memberPrice: 10.5, marketPrice: 15.5 },
  강동구: { memberPrice: 9.8, marketPrice: 14.5 },
  동대문구: { memberPrice: 9.0, marketPrice: 13.0 },
  성북구: { memberPrice: 8.5, marketPrice: 12.0 },
  서대문구: { memberPrice: 9.2, marketPrice: 13.5 },
  은평구: { memberPrice: 8.0, marketPrice: 11.5 },
  관악구: { memberPrice: 8.5, marketPrice: 12.0 },
  구로구: { memberPrice: 7.8, marketPrice: 10.5 },
  금천구: { memberPrice: 7.2, marketPrice: 9.5 },
  중랑구: { memberPrice: 7.5, marketPrice: 10.0 },
  강북구: { memberPrice: 7.5, marketPrice: 10.0 },
  도봉구: { memberPrice: 7.0, marketPrice: 9.0 },
  노원구: { memberPrice: 7.8, marketPrice: 10.5 },
};

function calculateComparisonMetrics(project: ProjectSummary): ComparisonData {
  const specs = getProjectSpecs(project.name, project.district, project.project_type);
  const stageOrder = STAGE_ORDER_MAP[project.current_status ?? ""] ?? 10;

  const benchmark = (project.district && DISTRICT_BENCHMARK_84[project.district]) || {
    memberPrice: 9.8,
    marketPrice: 14.5,
  };

  // Base simulation: Assume 6.0억 purchase price, 100% ratio
  const purchasePrice = 6.0;
  const memberPrice84 = benchmark.memberPrice;
  const estimatedContribution = Math.max(0, memberPrice84 - purchasePrice);
  const totalInvestment = purchasePrice + estimatedContribution;
  const expectedProfit = benchmark.marketPrice - totalInvestment;
  const expectedRoi = totalInvestment > 0 ? (expectedProfit / totalInvestment) * 100 : 0;

  return {
    project,
    specs,
    stageOrder,
    expectedProfit,
    expectedRoi,
    estimatedContribution,
    memberPrice84,
  };
}

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [projectA, setProjectA] = useState<ComparisonData | null>(null);
  const [projectB, setProjectB] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);

  // Search states
  const [queryA, setQueryA] = useState("");
  const [queryB, setQueryB] = useState("");
  const [resultsA, setResultsA] = useState<ProjectSummary[]>([]);
  const [resultsB, setResultsB] = useState<ProjectSummary[]>([]);
  const [searchingA, setSearchingA] = useState(false);
  const [searchingB, setSearchingB] = useState(false);

  // Load projects from search params or default battle
  useEffect(() => {
    async function loadInitialProjects() {
      setLoading(true);
      const supabase = getSupabaseClient();
      const p1Id = searchParams.get("p1");
      const p2Id = searchParams.get("p2");

      try {
        if (p1Id && p2Id) {
          const { data } = await supabase
            .from("projects")
            .select("id,name,address,district,project_type,current_status,updated_at")
            .in("id", [p1Id, p2Id]);

          const foundA = data?.find((p) => p.id === p1Id);
          const foundB = data?.find((p) => p.id === p2Id);

          if (foundA) setProjectA(calculateComparisonMetrics(foundA));
          if (foundB) setProjectB(calculateComparisonMetrics(foundB));
        } else {
          // Default battle: 노량진 1구역 vs 노량진 3구역 (or 이문1 vs 이문3)
          const { data } = await supabase
            .from("projects")
            .select("id,name,address,district,project_type,current_status,updated_at")
            .or("name.ilike.%노량진1%,name.ilike.%노량진3%,name.ilike.%한남3%,name.ilike.%한남2%")
            .limit(4);

          const defaultA = data?.find((p) => p.name.includes("노량진1")) || data?.[0];
          const defaultB = data?.find((p) => p.name.includes("노량진3")) || data?.[1];

          if (defaultA) setProjectA(calculateComparisonMetrics(defaultA));
          if (defaultB) setProjectB(calculateComparisonMetrics(defaultB));
        }
      } catch (err) {
        console.error("Failed to load comparison projects:", err);
      } finally {
        setLoading(false);
      }
    }

    loadInitialProjects();
  }, [searchParams]);

  // Autocomplete for Project A
  useEffect(() => {
    const term = queryA.trim();
    if (!term) return;

    const timer = setTimeout(async () => {
      setSearchingA(true);
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase
          .from("projects")
          .select("id,name,address,district,project_type,current_status,updated_at")
          .or(`name.ilike.%${term}%,address.ilike.%${term}%`)
          .limit(8);
        setResultsA(data ?? []);
      } finally {
        setSearchingA(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [queryA]);

  // Autocomplete for Project B
  useEffect(() => {
    const term = queryB.trim();
    if (!term) return;

    const timer = setTimeout(async () => {
      setSearchingB(true);
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase
          .from("projects")
          .select("id,name,address,district,project_type,current_status,updated_at")
          .or(`name.ilike.%${term}%,address.ilike.%${term}%`)
          .limit(8);
        setResultsB(data ?? []);
      } finally {
        setSearchingB(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [queryB]);

  const selectProject = (target: "A" | "B", project: ProjectSummary) => {
    const nextA = target === "A" ? calculateComparisonMetrics(project) : projectA;
    const nextB = target === "B" ? calculateComparisonMetrics(project) : projectB;

    if (target === "A") {
      setProjectA(nextA);
      setQueryA("");
      setResultsA([]);
    } else {
      setProjectB(nextB);
      setQueryB("");
      setResultsB([]);
    }

    if (nextA && nextB) {
      startTransition(() => {
        router.push(`/compare?p1=${nextA.project.id}&p2=${nextB.project.id}`);
      });
    }
  };

  const handlePresetSelect = async (q1: string, q2: string) => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const [{ data: data1 }, { data: data2 }] = await Promise.all([
        supabase
          .from("projects")
          .select("id,name,address,district,project_type,current_status,updated_at")
          .ilike("name", `%${q1}%`)
          .limit(1),
        supabase
          .from("projects")
          .select("id,name,address,district,project_type,current_status,updated_at")
          .ilike("name", `%${q2}%`)
          .limit(1),
      ]);

      if (data1?.[0]) setProjectA(calculateComparisonMetrics(data1[0]));
      if (data2?.[0]) setProjectB(calculateComparisonMetrics(data2[0]));

      if (data1?.[0] && data2?.[0]) {
        router.push(`/compare?p1=${data1[0].id}&p2=${data2[0].id}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Determine Winners
  const generalRatioA = projectA?.specs.generalRatio ? parseFloat(projectA.specs.generalRatio) : 0;
  const generalRatioB = projectB?.specs.generalRatio ? parseFloat(projectB.specs.generalRatio) : 0;
  const ratioWinner = generalRatioA > generalRatioB ? "A" : generalRatioB > generalRatioA ? "B" : "TIE";

  const speedA = projectA?.stageOrder ?? 0;
  const speedB = projectB?.stageOrder ?? 0;
  const speedWinner = speedA > speedB ? "A" : speedB > speedA ? "B" : "TIE";

  const roiA = projectA?.expectedRoi ?? 0;
  const roiB = projectB?.expectedRoi ?? 0;
  const roiWinner = roiA > roiB ? "A" : roiB > roiA ? "B" : "TIE";

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#171918]">
      <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10 sm:py-14">
        <Header />

        {/* Page Title Header */}
        <section className="pt-12 sm:pt-16">
          <p className="text-sm font-semibold tracking-[0.12em] text-[#e6523a]">HEAD-TO-HEAD COMPARISON</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.055em] sm:text-5xl text-[#171918]">
            관심 구역 1:1 맞춤 비교 분석
          </h1>
          <p className="mt-3 text-sm text-[#6e716e]">
            두 개 구역을 나란히 놓고 <strong>추진 속도, 일반분양 비율, 단지 설계 스펙, 예상 분담금 및 최종 투자 수익률(ROI)</strong>을 비교합니다.
          </p>

          {/* Quick Battle Presets */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#171918]">추천 매치:</span>
            {PRESET_BATTLES.map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={() => handlePresetSelect(b.q1, b.q2)}
                className="rounded-xl border border-black/8 bg-white px-3 py-1.5 text-xs font-semibold text-[#444] transition hover:border-black/20 hover:bg-[#f7f7f4] active:scale-[0.98]"
              >
                {b.label}
              </button>
            ))}
          </div>
        </section>

        {/* Project Selector Box */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {/* Selector A */}
          <div className="relative rounded-3xl border border-black/8 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <span className="text-[11px] font-bold text-[#e6523a]">구역 A (기준 사업장)</span>
            <div className="mt-2 flex items-center justify-between">
              <p className="font-bold text-lg text-[#171918] truncate">
                {projectA?.project.name ?? "구역 A를 선택하세요"}
              </p>
              {projectA && (
                <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-semibold text-[#666]">
                  {projectA.project.district}
                </span>
              )}
            </div>

            <div className="mt-3">
              <input
                type="text"
                placeholder="다른 사업장 검색하여 변경..."
                value={queryA}
                onChange={(e) => {
                  const val = e.target.value;
                  setQueryA(val);
                  if (!val.trim()) setResultsA([]);
                }}
                className="w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-3.5 py-2 text-xs outline-none placeholder:text-[#999] focus:bg-white focus:border-black/30"
              />
            </div>

            {/* Autocomplete Dropdown A */}
            {resultsA.length > 0 && (
              <div className="absolute left-5 right-5 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-black/10 bg-white shadow-xl">
                {resultsA.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectProject("A", p)}
                    className="w-full text-left p-3 border-b border-black/5 hover:bg-[#f7f7f4] transition last:border-0"
                  >
                    <p className="font-bold text-xs text-[#171918]">{p.name}</p>
                    <p className="text-[11px] text-[#777a76]">{p.district} • {p.current_status ?? "단계 확인 중"}</p>
                  </button>
                ))}
              </div>
            )}
            {searchingA && <p className="mt-1 text-[11px] text-[#888] animate-pulse">검색 중...</p>}
          </div>

          {/* Selector B */}
          <div className="relative rounded-3xl border border-black/8 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <span className="text-[11px] font-bold text-indigo-600">구역 B (비교 사업장)</span>
            <div className="mt-2 flex items-center justify-between">
              <p className="font-bold text-lg text-[#171918] truncate">
                {projectB?.project.name ?? "구역 B를 선택하세요"}
              </p>
              {projectB && (
                <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-semibold text-[#666]">
                  {projectB.project.district}
                </span>
              )}
            </div>

            <div className="mt-3">
              <input
                type="text"
                placeholder="다른 사업장 검색하여 변경..."
                value={queryB}
                onChange={(e) => {
                  const val = e.target.value;
                  setQueryB(val);
                  if (!val.trim()) setResultsB([]);
                }}
                className="w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-3.5 py-2 text-xs outline-none placeholder:text-[#999] focus:bg-white focus:border-black/30"
              />
            </div>

            {/* Autocomplete Dropdown B */}
            {resultsB.length > 0 && (
              <div className="absolute left-5 right-5 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-black/10 bg-white shadow-xl">
                {resultsB.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectProject("B", p)}
                    className="w-full text-left p-3 border-b border-black/5 hover:bg-[#f7f7f4] transition last:border-0"
                  >
                    <p className="font-bold text-xs text-[#171918]">{p.name}</p>
                    <p className="text-[11px] text-[#777a76]">{p.district} • {p.current_status ?? "단계 확인 중"}</p>
                  </button>
                ))}
              </div>
            )}
            {searchingB && <p className="mt-1 text-[11px] text-[#888] animate-pulse">검색 중...</p>}
          </div>
        </section>

        {/* Loading Skeleton */}
        {loading && (
          <div className="mt-8 h-96 rounded-3xl bg-black/5 animate-pulse" />
        )}

        {/* Comparison Dashboard */}
        {!loading && projectA && projectB && (
          <section className="mt-8 space-y-6 pb-20">
            {/* 1. Summary Winner Card */}
            <div className="rounded-3xl border border-black/8 bg-gradient-to-br from-white to-[#fbfbfa] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              <h3 className="font-bold text-lg text-[#171918]">🏆 1:1 맞춤 비교 총평 & 승자 판정</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs">
                {/* Winner 1: Speed */}
                <div className="rounded-2xl bg-white border border-black/5 p-4 shadow-2xs">
                  <span className="text-[11px] text-[#777a76]">추진 속도 우위</span>
                  <p className="mt-1 font-bold text-sm text-[#171918]">
                    {speedWinner === "A"
                      ? `👑 ${projectA.project.name}`
                      : speedWinner === "B"
                      ? `👑 ${projectB.project.name}`
                      : "동일 추진 단계"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-emerald-700">
                    {speedWinner === "A"
                      ? `${projectA.project.current_status} 단계로 더 앞섬`
                      : speedWinner === "B"
                      ? `${projectB.project.current_status} 단계로 더 앞섬`
                      : "동일 단계 진행 중"}
                  </p>
                </div>

                {/* Winner 2: Feasibility Ratio */}
                <div className="rounded-2xl bg-white border border-black/5 p-4 shadow-2xs">
                  <span className="text-[11px] text-[#777a76]">일반분양 비율 (사업성)</span>
                  <p className="mt-1 font-bold text-sm text-[#171918]">
                    {ratioWinner === "A"
                      ? `👑 ${projectA.project.name}`
                      : ratioWinner === "B"
                      ? `👑 ${projectB.project.name}`
                      : "유사 사업성"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-blue-700">
                    {ratioWinner === "A"
                      ? `일반분양 ${projectA.specs.generalRatio}로 우위`
                      : ratioWinner === "B"
                      ? `일반분양 ${projectB.specs.generalRatio}로 우위`
                      : "양 구역 모두 우수"}
                  </p>
                </div>

                {/* Winner 3: Expected ROI */}
                <div className="rounded-2xl bg-white border border-black/5 p-4 shadow-2xs">
                  <span className="text-[11px] text-[#777a76]">예상 투자수익률 (ROI)</span>
                  <p className="mt-1 font-bold text-sm text-[#171918]">
                    {roiWinner === "A"
                      ? `👑 ${projectA.project.name}`
                      : roiWinner === "B"
                      ? `👑 ${projectB.project.name}`
                      : "유사 수익률"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-rose-700">
                    {roiWinner === "A"
                      ? `예상 수익률 +${projectA.expectedRoi.toFixed(1)}%`
                      : roiWinner === "B"
                      ? `예상 수익률 +${projectB.expectedRoi.toFixed(1)}%`
                      : `수익률 약 +${projectA.expectedRoi.toFixed(1)}%`}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Side-by-Side Comparison Table */}
            <div className="overflow-hidden rounded-3xl border border-black/8 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-black/8 bg-[#f7f7f4] text-[#171918]">
                    <th className="p-4 sm:p-5 font-bold w-1/3">비교 항목</th>
                    <th className="p-4 sm:p-5 font-bold text-[#e6523a] w-1/3">
                      {projectA.project.name}
                    </th>
                    <th className="p-4 sm:p-5 font-bold text-indigo-600 w-1/3">
                      {projectB.project.name}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {/* Row: District */}
                  <tr>
                    <td className="p-4 sm:p-5 font-semibold text-[#777a76]">자치구 및 위치</td>
                    <td className="p-4 sm:p-5 font-bold text-[#171918]">{projectA.project.district}</td>
                    <td className="p-4 sm:p-5 font-bold text-[#171918]">{projectB.project.district}</td>
                  </tr>

                  {/* Row: Current Stage */}
                  <tr className="bg-black/[0.01]">
                    <td className="p-4 sm:p-5 font-semibold text-[#777a76]">현재 추진 단계</td>
                    <td className="p-4 sm:p-5">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-800 text-xs">
                        {projectA.project.current_status ?? "단계 확인 중"}
                      </span>
                    </td>
                    <td className="p-4 sm:p-5">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-800 text-xs">
                        {projectB.project.current_status ?? "단계 확인 중"}
                      </span>
                    </td>
                  </tr>

                  {/* Row: Total Units */}
                  <tr>
                    <td className="p-4 sm:p-5 font-semibold text-[#777a76]">계획 총 세대수</td>
                    <td className="p-4 sm:p-5 font-bold text-base text-[#171918]">
                      {projectA.specs.totalUnits
                        ? `${projectA.specs.totalUnits.toLocaleString()}세대`
                        : "사업시행인가 시 확정"}
                    </td>
                    <td className="p-4 sm:p-5 font-bold text-base text-[#171918]">
                      {projectB.specs.totalUnits
                        ? `${projectB.specs.totalUnits.toLocaleString()}세대`
                        : "사업시행인가 시 확정"}
                    </td>
                  </tr>

                  {/* Row: General Units Ratio */}
                  <tr className="bg-blue-50/30">
                    <td className="p-4 sm:p-5 font-semibold text-[#777a76]">일반분양 비율 (사업성 척도)</td>
                    <td className="p-4 sm:p-5">
                      <span className="font-extrabold text-blue-700 text-base">
                        {projectA.specs.generalRatio ?? "산정 예정"}
                      </span>
                      {ratioWinner === "A" && (
                        <span className="ml-2 rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">
                          우위
                        </span>
                      )}
                    </td>
                    <td className="p-4 sm:p-5">
                      <span className="font-extrabold text-blue-700 text-base">
                        {projectB.specs.generalRatio ?? "산정 예정"}
                      </span>
                      {ratioWinner === "B" && (
                        <span className="ml-2 rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">
                          우위
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Row: Planned FAR & Floors */}
                  <tr>
                    <td className="p-4 sm:p-5 font-semibold text-[#777a76]">계획 용적률 / 최고 층수</td>
                    <td className="p-4 sm:p-5 font-medium text-[#171918]">
                      {projectA.specs.far ?? "250%"} / {projectA.specs.floors ?? "최고 30층"}
                    </td>
                    <td className="p-4 sm:p-5 font-medium text-[#171918]">
                      {projectB.specs.far ?? "250%"} / {projectB.specs.floors ?? "최고 30층"}
                    </td>
                  </tr>

                  {/* Row: Builder */}
                  <tr className="bg-black/[0.01]">
                    <td className="p-4 sm:p-5 font-semibold text-[#777a76]">시공사 (브랜드)</td>
                    <td className="p-4 sm:p-5 font-bold text-[#171918]">
                      {projectA.specs.builder ?? "선정 준비 중"}
                    </td>
                    <td className="p-4 sm:p-5 font-bold text-[#171918]">
                      {projectB.specs.builder ?? "선정 준비 중"}
                    </td>
                  </tr>

                  {/* Row: 84 Type Member Price */}
                  <tr>
                    <td className="p-4 sm:p-5 font-semibold text-[#777a76]">84㎡(34평) 조합원 예상 분양가</td>
                    <td className="p-4 sm:p-5 font-bold text-[#171918]">
                      약 {projectA.memberPrice84}억원
                    </td>
                    <td className="p-4 sm:p-5 font-bold text-[#171918]">
                      약 {projectB.memberPrice84}억원
                    </td>
                  </tr>

                  {/* Row: Expected Contribution for 6.0B Purchase */}
                  <tr className="bg-amber-50/40">
                    <td className="p-4 sm:p-5 font-semibold text-[#777a76]">
                      동일 6억원 매수 시 예상 분담금
                    </td>
                    <td className="p-4 sm:p-5 font-bold text-amber-900">
                      약 +{projectA.estimatedContribution.toFixed(1)}억원
                    </td>
                    <td className="p-4 sm:p-5 font-bold text-amber-900">
                      약 +{projectB.estimatedContribution.toFixed(1)}억원
                    </td>
                  </tr>

                  {/* Row: Expected ROI */}
                  <tr className="bg-emerald-50/50">
                    <td className="p-4 sm:p-5 font-semibold text-emerald-950">
                      최종 예상 투자 수익률 (ROI)
                    </td>
                    <td className="p-4 sm:p-5">
                      <span className="text-lg font-black text-emerald-700">
                        +{projectA.expectedRoi.toFixed(1)}%
                      </span>
                      {roiWinner === "A" && (
                        <span className="ml-2 rounded-md bg-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900">
                          수익률 1위
                        </span>
                      )}
                    </td>
                    <td className="p-4 sm:p-5">
                      <span className="text-lg font-black text-emerald-700">
                        +{projectB.expectedRoi.toFixed(1)}%
                      </span>
                      {roiWinner === "B" && (
                        <span className="ml-2 rounded-md bg-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900">
                          수익률 1위
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Row: Action Links */}
                  <tr>
                    <td className="p-4 sm:p-5 font-semibold text-[#777a76]">상세보기 & 지도</td>
                    <td className="p-4 sm:p-5 space-y-1.5">
                      <Link
                        href={`/projects/${projectA.project.id}`}
                        className="inline-block rounded-xl bg-[#171918] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-black transition"
                      >
                        상세 분석 & 계산기 ➔
                      </Link>
                      <div>
                        <a
                          href={getNaverMapUrl(projectA.project.district, projectA.project.address, projectA.project.name)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-emerald-700 hover:underline"
                        >
                          🗺️ 네이버 지도 위치 ↗
                        </a>
                      </div>
                    </td>
                    <td className="p-4 sm:p-5 space-y-1.5">
                      <Link
                        href={`/projects/${projectB.project.id}`}
                        className="inline-block rounded-xl bg-[#171918] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-black transition"
                      >
                        상세 분석 & 계산기 ➔
                      </Link>
                      <div>
                        <a
                          href={getNaverMapUrl(projectB.project.district, projectB.project.address, projectB.project.name)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-emerald-700 hover:underline"
                        >
                          🗺️ 네이버 지도 위치 ↗
                        </a>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f7f7f4] flex items-center justify-center text-sm text-[#777a76]">비교 분석 화면을 불러오는 중...</div>}>
      <CompareContent />
    </Suspense>
  );
}
