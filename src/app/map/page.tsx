"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getProjectSpecs } from "@/lib/data/project-specs";
import { getProjectCoordinates, DISTRICT_COORDINATES } from "@/lib/utils/coordinates";
import { getNaverMapUrl } from "@/lib/utils/map";

type MapProject = {
  id: string;
  name: string;
  address: string;
  district: string | null;
  project_type: string | null;
  current_status: string | null;
  updated_at: string;
  lat: number;
  lng: number;
  hasRecentEvent?: boolean;
};

const STAGE_FILTERS = [
  { label: "전체", value: "ALL" },
  { label: "🟢 관리처분·착공", value: "ADVANCED" },
  { label: "🔵 사업시행인가", value: "APPROVED" },
  { label: "🟡 조합설립인가", value: "UNION" },
  { label: "⚪ 정비구역", value: "DESIGNATED" },
];

const SEOUL_DISTRICTS = [
  "전체 자치구",
  "강남구", "서초구", "송파구", "용산구", "성동구", "마포구", "동작구",
  "영등포구", "양천구", "강동구", "광진구", "동대문구", "성북구", "서대문구",
  "은평구", "종로구", "중구", "관악구", "구로구", "금천구", "강서구",
  "중랑구", "강북구", "도봉구", "노원구",
];

// Seoul Map bounding box for SVG projection
const MAP_BOUNDS = {
  minLat: 37.42,
  maxLat: 37.70,
  minLng: 126.75,
  maxLng: 127.20,
};

function projectToSvg(lat: number, lng: number, width: number, height: number) {
  const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * width;
  const y = height - ((lat - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * height;
  return { x, y };
}

function getStageCategory(status: string | null): "ADVANCED" | "APPROVED" | "UNION" | "DESIGNATED" {
  if (!status) return "DESIGNATED";
  if (/관리처분|착공|준공|분양|철거|이전고시/.test(status)) return "ADVANCED";
  if (/사업시행/.test(status)) return "APPROVED";
  if (/조합설립|추진위/.test(status)) return "UNION";
  return "DESIGNATED";
}

function getMarkerColor(category: "ADVANCED" | "APPROVED" | "UNION" | "DESIGNATED") {
  switch (category) {
    case "ADVANCED":
      return { fill: "#10b981", border: "#059669", label: "관리처분·착공" };
    case "APPROVED":
      return { fill: "#3b82f6", border: "#2563eb", label: "사업시행인가" };
    case "UNION":
      return { fill: "#f59e0b", border: "#d97706", label: "조합설립" };
    case "DESIGNATED":
      return { fill: "#9ca3af", border: "#6b7280", label: "정비구역" };
  }
}

function MapContent() {
  const [projects, setProjects] = useState<MapProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState("전체 자치구");
  const [selectedStage, setSelectedStage] = useState("ALL");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedProject, setSelectedProject] = useState<MapProject | null>(null);
  const [recentOnly, setRecentOnly] = useState(false);

  useEffect(() => {
    async function loadProjects() {
      setLoading(true);
      try {
        const supabase = getSupabaseClient();
        const [{ data: pData }, { data: eData }] = await Promise.all([
          supabase
            .from("projects")
            .select("id,name,address,district,project_type,current_status,updated_at,latitude,longitude")
            .limit(600),
          supabase
            .from("events")
            .select("project_id")
            .order("occurred_at", { ascending: false })
            .limit(200),
        ]);

        const recentProjectIds = new Set((eData ?? []).map((e) => e.project_id).filter(Boolean));

        const mapped: MapProject[] = (pData ?? []).map((p) => {
          const coords = getProjectCoordinates(p.id, p.district, p.latitude, p.longitude);
          return {
            id: p.id,
            name: p.name,
            address: p.address,
            district: p.district,
            project_type: p.project_type,
            current_status: p.current_status,
            updated_at: p.updated_at,
            lat: coords.lat,
            lng: coords.lng,
            hasRecentEvent: recentProjectIds.has(p.id),
          };
        });

        setProjects(mapped);
        if (mapped.length > 0) {
          // Select an iconic project by default
          const defaultProj = mapped.find((p) => p.name.includes("한남3") || p.name.includes("이문1")) || mapped[0];
          setSelectedProject(defaultProj);
        }
      } catch (err) {
        console.error("Map load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // 1. District filter
      if (selectedDistrict !== "전체 자치구" && p.district !== selectedDistrict) {
        return false;
      }
      // 2. Stage filter
      const category = getStageCategory(p.current_status);
      if (selectedStage !== "ALL" && category !== selectedStage) {
        return false;
      }
      // 3. Keyword filter
      if (searchKeyword.trim()) {
        const term = searchKeyword.trim().toLowerCase();
        const matches =
          p.name.toLowerCase().includes(term) ||
          (p.district && p.district.toLowerCase().includes(term)) ||
          p.address.toLowerCase().includes(term);
        if (!matches) return false;
      }
      // 4. Recent only
      if (recentOnly && !p.hasRecentEvent) {
        return false;
      }
      return true;
    });
  }, [projects, selectedDistrict, selectedStage, searchKeyword, recentOnly]);

  const selectedSpecs = selectedProject
    ? getProjectSpecs(selectedProject.name, selectedProject.district, selectedProject.project_type)
    : null;

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#171918]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
        <Header />

        {/* Page Title */}
        <section className="pt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold tracking-[0.12em] text-[#e6523a]">INTERACTIVE MAP</p>
              <h1 className="mt-1 text-3xl font-bold tracking-[-0.055em] sm:text-4xl text-[#171918]">
                서울 정비사업 핫스팟 지도
              </h1>
              <p className="mt-1 text-xs text-[#777a76]">
                서울시 25개 자치구별 재개발·재건축 사업장의 위치, 추진 단계, 최근 공고 핫스팟을 지도에서 한눈에 확인합니다.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-[#171918]">조회된 사업장:</span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-extrabold text-emerald-800">
                {filteredProjects.length}개 구역
              </span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="mt-6 space-y-3 rounded-3xl border border-black/8 bg-white p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search input */}
              <div className="flex-1 min-w-[220px]">
                <input
                  type="text"
                  placeholder="사업장명, 지번(예: 한남, 대치 66), 자치구 검색..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-3.5 py-2 text-xs outline-none focus:bg-white focus:border-black/30"
                />
              </div>

              {/* District select */}
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                aria-label="자치구 필터 선택"
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[#171918] outline-none"
              >
                {SEOUL_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              {/* Recent events toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#171918] select-none">
                <input
                  type="checkbox"
                  checked={recentOnly}
                  onChange={(e) => setRecentOnly(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-0"
                />
                <span>🔥 최근 공고 등록 구역만 보기</span>
              </label>
            </div>

            {/* Stage filter chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-black/5">
              <span className="text-[11px] font-bold text-[#777a76] mr-1">추진단계:</span>
              {STAGE_FILTERS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSelectedStage(s.value)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    selectedStage === s.value
                      ? "bg-[#171918] text-white shadow-xs"
                      : "bg-[#f7f7f4] text-[#555] hover:bg-black/5"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Map + List Split Screen */}
        <section className="mt-6 grid gap-6 lg:grid-cols-12 pb-20">
          {/* Interactive Map Visualizer (7 cols) */}
          <div className="lg:col-span-7 flex flex-col rounded-3xl border border-black/8 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] min-h-[480px]">
            <div className="flex items-center justify-between border-b border-black/5 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#171918]">서울시 정비사업 공간 분포</span>
                <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-medium text-[#777]">
                  인터랙티브 핀 맵
                </span>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-2 text-[10px] text-[#666]">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> 관리처분/착공
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-500" /> 사업시행
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> 조합설립
                </span>
              </div>
            </div>

            {/* SVG Map Container */}
            <div className="relative flex-1 rounded-2xl bg-[#f5f5f1] border border-black/5 overflow-hidden flex items-center justify-center p-2 min-h-[380px]">
              {loading ? (
                <div className="text-center text-xs text-[#777a76] animate-pulse">
                  지도를 불러오는 중입니다...
                </div>
              ) : (
                <svg
                  viewBox="0 0 700 500"
                  className="w-full h-full max-h-[460px] select-none"
                >
                  {/* Background Grid & Han River Line */}
                  <path
                    d="M 50,320 Q 200,340 320,300 T 520,290 T 680,260"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="14"
                    strokeLinecap="round"
                    opacity="0.6"
                  />
                  <text x="330" y="320" fill="#94a3b8" fontSize="11" fontWeight="bold" opacity="0.8">
                    한강
                  </text>

                  {/* District Labels */}
                  {Object.entries(DISTRICT_COORDINATES).map(([distName, coord]) => {
                    const pos = projectToSvg(coord.lat, coord.lng, 700, 500);
                    return (
                      <text
                        key={distName}
                        x={pos.x}
                        y={pos.y}
                        fill="#999"
                        fontSize="9"
                        fontWeight="600"
                        textAnchor="middle"
                        className="pointer-events-none"
                        opacity="0.6"
                      >
                        {distName.replace("구", "")}
                      </text>
                    );
                  })}

                  {/* Project Pins */}
                  {filteredProjects.map((p) => {
                    const pos = projectToSvg(p.lat, p.lng, 700, 500);
                    const category = getStageCategory(p.current_status);
                    const marker = getMarkerColor(category);
                    const isSelected = selectedProject?.id === p.id;

                    return (
                      <g
                        key={p.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        onClick={() => setSelectedProject(p)}
                        className="cursor-pointer transition-transform hover:scale-125"
                      >
                        {/* Recent Event Pulse Ring */}
                        {p.hasRecentEvent && (
                          <circle
                            r={isSelected ? "14" : "10"}
                            fill={marker.fill}
                            opacity="0.3"
                            className="animate-ping"
                          />
                        )}

                        {/* Selected Indicator */}
                        {isSelected && (
                          <circle
                            r="12"
                            fill="none"
                            stroke="#e6523a"
                            strokeWidth="2.5"
                          />
                        )}

                        {/* Pin Dot */}
                        <circle
                          r={isSelected ? "6.5" : "4.5"}
                          fill={marker.fill}
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                      </g>
                    );
                  })}
                </svg>
              )}

              {/* Map Footer Hint */}
              <div className="absolute bottom-2 left-2 rounded-lg bg-white/80 backdrop-blur-xs px-2.5 py-1 text-[10px] text-[#666] border border-black/5">
                💡 핀을 클릭하면 상세 사업성 및 분담금 계산기로 바로 연결됩니다.
              </div>
            </div>
          </div>

          {/* Right Panel: Selected Project Detail Card + Project List (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Selected Project Highlight Card */}
            {selectedProject ? (
              <div className="rounded-3xl border border-black/8 bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#e6523a]">선택된 사업장</span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    {selectedProject.current_status ?? "단계 확인 중"}
                  </span>
                </div>

                <h3 className="mt-2 text-xl font-bold text-[#171918]">
                  {selectedProject.name}
                </h3>
                <p className="mt-1 text-xs text-[#777a76]">{selectedProject.address}</p>

                {/* Specs highlight */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-[#f7f7f4] p-3">
                    <p className="text-[11px] text-[#777a76]">계획 총 세대수</p>
                    <p className="mt-0.5 font-bold text-[#171918]">
                      {selectedSpecs?.totalUnits ? `${selectedSpecs.totalUnits.toLocaleString()}세대` : "인가 수립 중"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#f7f7f4] p-3">
                    <p className="text-[11px] text-[#777a76]">일반분양 비율</p>
                    <p className="mt-0.5 font-bold text-blue-700">
                      {selectedSpecs?.generalRatio ?? "산정 예정"}
                    </p>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="mt-4 space-y-2">
                  <Link
                    href={`/projects/${selectedProject.id}`}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#171918] py-2.5 text-xs font-bold text-white transition hover:bg-black"
                  >
                    <span>📊 사업성 & 분담금 계산기 보기 ➔</span>
                  </Link>

                  <div className="flex gap-2">
                    <Link
                      href={`/compare?p1=${selectedProject.id}`}
                      className="flex-1 text-center rounded-xl border border-black/10 bg-[#f7f7f4] py-2 text-xs font-bold text-[#333] transition hover:bg-black/5"
                    >
                      ⚔️ 다른 구역과 비교
                    </Link>

                    <a
                      href={getNaverMapUrl(selectedProject.district, selectedProject.address, selectedProject.name)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 text-center rounded-xl border border-emerald-600/20 bg-emerald-50 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
                    >
                      🗺️ 네이버 지도 ↗
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-black/8 bg-white p-6 text-center text-xs text-[#777a76]">
                지도에서 핀을 클릭하세요.
              </div>
            )}

            {/* Filtered Projects List */}
            <div className="rounded-3xl border border-black/8 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              <div className="flex items-center justify-between border-b border-black/5 pb-3">
                <span className="font-bold text-xs text-[#171918]">해당 조건 사업장 목록</span>
                <span className="text-[11px] text-[#777a76]">{filteredProjects.length}개</span>
              </div>

              <div className="mt-3 max-h-72 overflow-y-auto space-y-2 pr-1">
                {filteredProjects.slice(0, 30).map((p) => {
                  const isSelected = selectedProject?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProject(p)}
                      className={`w-full text-left rounded-2xl p-3 border transition ${
                        isSelected
                          ? "border-[#e6523a] bg-rose-50/20"
                          : "border-black/5 bg-[#fbfbfa] hover:border-black/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {p.district && (
                            <span className="shrink-0 rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold text-[#171918]">
                              {p.district}
                            </span>
                          )}
                          <p className="font-bold text-xs text-[#171918] truncate">{p.name}</p>
                        </div>
                        {p.current_status && (
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            {p.current_status}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-[#777a76] truncate">{p.address}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f7f7f4] flex items-center justify-center text-sm text-[#777a76]">정비지도를 불러오는 중...</div>}>
      <MapContent />
    </Suspense>
  );
}
