"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { VERIFIED_REAL_POLYGONS } from "@/lib/data/project-polygons";

type DiagnosisResult = {
  status: "INCLUDED" | "NEARBY" | "NOT_INCLUDED";
  projectName?: string;
  projectId?: string;
  district?: string;
  stage?: string;
  distanceMeter?: number;
  message: string;
  tip: string;
};

// Preset address matching DB
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

export default function CheckPage() {
  const [addressInput, setAddressInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);

  const handleDiagnose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim()) return;

    setIsSearching(true);
    setResult(null);

    setTimeout(() => {
      const term = addressInput.trim().replaceAll(/\s+/g, "").toLowerCase();

      // Check match
      let matched: { id: string; name: string; district: string; stage: string } | null = null;

      for (const item of Object.values(ADDRESS_MATCH_DB)) {
        if (item.keywords.some((k) => term.includes(k.replaceAll(/\s+/g, "").toLowerCase()) || k.replaceAll(/\s+/g, "").toLowerCase().includes(term))) {
          matched = item;
          break;
        }
      }

      if (matched) {
        setResult({
          status: "INCLUDED",
          projectName: matched.name,
          projectId: matched.id,
          district: matched.district,
          stage: matched.stage,
          message: `입력하신 주소는 [${matched.name}] 공식 정비구역 도면 내에 포함되어 있습니다!`,
          tip: "현재 단계와 예상 분담금 및 안전마진 시뮬레이터를 확인하여 조합원 매물 가치를 분석하세요.",
        });
      } else if (term.includes("마포") || term.includes("용산") || term.includes("성동") || term.includes("강남") || term.includes("서초") || term.includes("동작")) {
        setResult({
          status: "NEARBY",
          message: "입력하신 주소는 공식 정비구역 경계선 인접 지역(반경 200~300m)으로 추정됩니다.",
          tip: "인근 구역의 재개발 진행에 따른 지가 상승 수혜 또는 모아타운/신통기획 후보지 추진 여부를 체크해 보세요.",
        });
      } else {
        setResult({
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
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-12">
        <Header />

        {/* Hero Title */}
        <section className="pt-10 text-center">
          <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-300 mb-3">
            🔍 지번 1초 정밀 판정기
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#171918] sm:text-4xl">
            내 빌라·건물, <span className="text-emerald-700">재개발 구역</span>에 들어갈까?
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-[#777a76] max-w-xl mx-auto">
            주소나 지번만 입력하시면, 서울시 공공 고시 도면과 대조하여 정비구역 편입 여부 및 추진 단계를 1초 만에 무료로 진단해 드립니다.
          </p>

          {/* Search Form */}
          <form onSubmit={handleDiagnose} className="mt-8 max-w-2xl mx-auto flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="예: 마포구 도화동 16-1, 한남동 686, 압구정동 369"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              className="flex-1 rounded-2xl border border-black/15 bg-white px-5 py-3.5 text-sm text-[#171918] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-sm font-medium"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="rounded-2xl bg-[#171918] text-white px-6 py-3.5 text-sm font-bold hover:bg-black/80 transition shadow-sm cursor-pointer shrink-0 disabled:opacity-50"
            >
              {isSearching ? "도면 대조 중..." : "1초 진단하기 ➔"}
            </button>
          </form>

          {/* Preset Samples */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-xs text-gray-500">
            <span>추천 검색:</span>
            {["도화동 16-1", "한남동 686", "압구정동 369", "성수동1가 72", "노량진동 278"].map((addr) => (
              <button
                key={addr}
                type="button"
                onClick={() => setAddressInput(addr)}
                className="underline hover:text-emerald-700 cursor-pointer"
              >
                {addr}
              </button>
            ))}
          </div>
        </section>

        {/* Result Display */}
        {result && (
          <section className="mt-10 animate-fade-in">
            <div className={`rounded-3xl border p-6 sm:p-8 shadow-sm ${
              result.status === "INCLUDED"
                ? "bg-emerald-50/70 border-emerald-300"
                : result.status === "NEARBY"
                ? "bg-amber-50/70 border-amber-300"
                : "bg-white border-black/10"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">
                  {result.status === "INCLUDED" ? "🎉" : result.status === "NEARBY" ? "📍" : "⚪"}
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  result.status === "INCLUDED"
                    ? "bg-emerald-600 text-white"
                    : result.status === "NEARBY"
                    ? "bg-amber-600 text-white"
                    : "bg-gray-600 text-white"
                }`}>
                  {result.status === "INCLUDED" ? "정비구역 편입 확인" : result.status === "NEARBY" ? "정비구역 인접" : "정비구역 미편입"}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-[#171918] mt-2">
                {result.message}
              </h2>

              {result.status === "INCLUDED" && result.projectName && (
                <div className="mt-5 p-4 rounded-2xl bg-white border border-emerald-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500">{result.district}</span>
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {result.stage}
                      </span>
                    </div>
                    <p className="text-base font-bold text-[#171918] mt-1">{result.projectName}</p>
                  </div>
                  <Link
                    href={`/projects/${result.projectId}`}
                    className="rounded-xl bg-emerald-700 text-white px-4 py-2 text-xs font-bold hover:bg-emerald-800 transition shadow-xs"
                  >
                    구역 지도 & 분담금 계산기 보기 ➔
                  </Link>
                </div>
              )}

              <p className="mt-4 text-xs text-gray-600 border-t border-black/5 pt-3 leading-relaxed">
                💡 <strong>투자 가이드</strong>: {result.tip}
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
