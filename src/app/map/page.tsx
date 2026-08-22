"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getProjectSpecs } from "@/lib/data/project-specs";
import { getProjectCoordinates } from "@/lib/utils/coordinates";
import { getNaverMapUrl } from "@/lib/utils/map";
import type { MapProject } from "@/components/SeoulInteractiveMap";

const SeoulInteractiveMap = dynamic(
  () => import("@/components/SeoulInteractiveMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[520px] bg-[#f5f5f1] rounded-2xl text-xs text-[#777a76] animate-pulse border border-black/5">
        🗺️ 서울시 정비사업 지도를 불러오는 중입니다...
      </div>
    ),
  }
);

const NaverMapView = dynamic(
  () => import("@/components/NaverMapView"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[520px] bg-[#f5f5f1] rounded-2xl text-xs text-[#777a76] animate-pulse border border-black/5">
        🗺️ 네이버 지도를 불러오는 중입니다...
      </div>
    ),
  }
);

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

const FALLBACK_SEOUL_PROJECTS: Array<{
  id: string;
  name: string;
  address: string;
  district: string;
  project_type: string;
  current_status: string;
  lat: number;
  lng: number;
}> = [
  { id: "cb005e1e-cad8-4c15-bd80-e6ce42a7a400", name: "마포로1-24도시환경정비지구", address: "마포구 도화동 16-1", district: "마포구", project_type: "도시정비형 재개발", current_status: "사업시행인가", lat: 37.5395, lng: 126.9471 },
  { id: "hannam-3", name: "한남3재정비촉진구역", address: "용산구 한남동 686", district: "용산구", project_type: "재개발", current_status: "관리처분인가", lat: 37.5325, lng: 127.0025 },
  { id: "hannam-2", name: "한남2재정비촉진구역", address: "용산구 보광동 272", district: "용산구", project_type: "재개발", current_status: "사업시행인가", lat: 37.5310, lng: 126.9950 },
  { id: "apgujeong-3", name: "압구정3구역(현대1~7차)", address: "강남구 압구정동 369", district: "강남구", project_type: "재건축", current_status: "조합설립인가", lat: 37.5285, lng: 127.0320 },
  { id: "apgujeong-2", name: "압구정2구역(신현대)", address: "강남구 압구정동 426", district: "강남구", project_type: "재건축", current_status: "조합설립인가", lat: 37.5260, lng: 127.0240 },
  { id: "seongsu-1", name: "성수전략정비구역1지구", address: "성동구 성수동1가 72", district: "성동구", project_type: "재개발", current_status: "조합설립인가", lat: 37.5385, lng: 127.0420 },
  { id: "seongsu-2", name: "성수전략정비구역2지구", address: "성동구 성수동2가 506", district: "성동구", project_type: "재개발", current_status: "조합설립인가", lat: 37.5360, lng: 127.0510 },
  { id: "noryangjin-1", name: "노량진1재정비촉진구역", address: "동작구 노량진동 278", district: "동작구", project_type: "재개발", current_status: "사업시행인가", lat: 37.5120, lng: 126.9410 },
  { id: "heukseok-9", name: "흑석9재정비촉진구역", address: "동작구 흑석동 90", district: "동작구", project_type: "재개발", current_status: "착공", lat: 37.5060, lng: 126.9620 },
  { id: "banpo-124", name: "반포주공1단지(1·2·4주구)", address: "서초구 반포동 810", district: "서초구", project_type: "재건축", current_status: "착공", lat: 37.5020, lng: 126.9920 },
  { id: "jamsil-5", name: "잠실주공5단지", address: "송파구 잠실동 27", district: "송파구", project_type: "재건축", current_status: "사업시행인가", lat: 37.5140, lng: 127.0980 },
  { id: "imun-1", name: "이문1재정비촉진구역", address: "동대문구 이문동 257", district: "동대문구", project_type: "재개발", current_status: "착공", lat: 37.5950, lng: 127.0620 },
  { id: "jangwi-4", name: "장위4구역(장위자이)", address: "성북구 장위동 62", district: "성북구", project_type: "재개발", current_status: "준공", lat: 37.6140, lng: 127.0420 },
  { id: "bukahyeon-2", name: "북아현2구역", address: "서대문구 북아현동 520", district: "서대문구", project_type: "재개발", current_status: "관리처분인가", lat: 37.5610, lng: 126.9530 },
  { id: "galhyeon-1", name: "갈현1구역", address: "은평구 갈현동 300", district: "은평구", project_type: "재개발", current_status: "관리처분인가", lat: 37.6210, lng: 126.9120 },
  { id: "yeouido-sibeom", name: "여의도시범아파트", address: "영등포구 여의도동 50", district: "영등포구", project_type: "재건축", current_status: "정비구역", lat: 37.5190, lng: 126.9340 },
  { id: "mokdong-7", name: "목동신시가지7단지", address: "양천구 목동 925", district: "양천구", project_type: "재건축", current_status: "정비구역", lat: 37.5280, lng: 126.8680 },
];

function getStageCategory(status: string | null): "ADVANCED" | "APPROVED" | "UNION" | "DESIGNATED" {
  if (!status) return "DESIGNATED";
  if (/관리처분|착공|준공|분양|철거|이전고시/.test(status)) return "ADVANCED";
  if (/사업시행/.test(status)) return "APPROVED";
  if (/조합설립|추진위/.test(status)) return "UNION";
  return "DESIGNATED";
}

function MapContent() {
  const [projects, setProjects] = useState<MapProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState("전체 자치구");
  const [selectedStage, setSelectedStage] = useState("ALL");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedProject, setSelectedProject] = useState<MapProject | null>(null);
  const [mapEngine, setMapEngine] = useState<"naver" | "tile">("naver");
  const [recentOnly, setRecentOnly] = useState(false);

  useEffect(() => {
    async function loadProjects() {
      setLoading(true);
      try {
        const supabase = getSupabaseClient();
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
        
        const dbPromise = Promise.all([
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

        const result = await Promise.race([dbPromise, timeoutPromise]);

        if (result) {
          const [{ data: pData }, { data: eData }] = result;
          const recentProjectIds = new Set((eData ?? []).map((e) => e.project_id).filter(Boolean));

          if (pData && pData.length > 0) {
            const mapped: MapProject[] = pData.map((p) => {
              const coords = getProjectCoordinates(p.id, p.district, p.latitude, p.longitude, p.address);
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
            setSelectedProject(mapped[0]);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Using fallback map projects:", err);
      }

      // Fallback
      const fallbackMapped: MapProject[] = FALLBACK_SEOUL_PROJECTS.map((p) => ({
        ...p,
        updated_at: new Date().toISOString(),
        hasRecentEvent: true,
      }));
      setProjects(fallbackMapped);
      setSelectedProject(fallbackMapped[0]);
      setLoading(false);
    }
    loadProjects();
  }, []);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (selectedDistrict !== "전체 자치구" && p.district !== selectedDistrict) {
        return false;
      }
      const category = getStageCategory(p.current_status);
      if (selectedStage !== "ALL" && category !== selectedStage) {
        return false;
      }
      if (searchKeyword.trim()) {
        const term = searchKeyword.trim().toLowerCase();
        const matches =
          p.name.toLowerCase().includes(term) ||
          (p.district && p.district.toLowerCase().includes(term)) ||
          p.address.toLowerCase().includes(term);
        if (!matches) return false;
      }
      if (recentOnly && !p.hasRecentEvent) {
        return false;
      }
      return true;
    });
  }, [projects, selectedDistrict, selectedStage, searchKeyword, recentOnly]);

  const selectedProjectSpecs = useMemo(() => {
    if (!selectedProject) return null;
    return getProjectSpecs(
      selectedProject.name,
      selectedProject.district,
      selectedProject.project_type
    );
  }, [selectedProject]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Top Filter Bar */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#171918] sm:text-3xl flex items-center gap-2">
              <span>🗺️ 서울 정비사업 지도</span>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                구역 폴리곤 레이더
              </span>
            </h1>
            <p className="mt-1 text-xs text-[#777a76]">
              서울시 25개 자치구 주요 재개발·재건축 사업장의 구역 경계선과 진행 단계를 한눈에 확인하세요.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl bg-white border border-black/10 p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setMapEngine("naver")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  mapEngine === "naver"
                    ? "bg-[#03c75a] text-white shadow-xs"
                    : "text-[#666] hover:bg-black/5"
                }`}
              >
                네이버 지도
              </button>
              <button
                type="button"
                onClick={() => setMapEngine("tile")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  mapEngine === "tile"
                    ? "bg-[#171918] text-white shadow-xs"
                    : "text-[#666] hover:bg-black/5"
                }`}
              >
                오픈 지도
              </button>
            </div>

            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#171918] bg-white border border-black/10 px-3 py-1.5 rounded-xl cursor-pointer shadow-2xs">
              <input
                type="checkbox"
                checked={recentOnly}
                onChange={(e) => setRecentOnly(e.target.checked)}
                className="accent-emerald-600 rounded"
              />
              <span>📢 최근 공고 있는 구역만</span>
            </label>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1">
            <input
              type="text"
              placeholder="사업장명, 구, 동 검색 (예: 마포로, 한남, 압구정)"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs text-[#171918] placeholder-[#999] focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword("")}
                className="absolute right-3 top-2 text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* District Select */}
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[#171918] focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
          >
            {SEOUL_DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Stage Buttons */}
          <div className="flex flex-wrap items-center gap-1">
            {STAGE_FILTERS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSelectedStage(s.value)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-2xs ${
                  selectedStage === s.value
                    ? "bg-[#171918] text-white"
                    : "bg-white border border-black/10 text-[#555] hover:bg-black/5"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Map + Sidebar Layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px] items-start">
        {/* Map View */}
        <div className="h-[550px] sm:h-[620px] w-full rounded-2xl overflow-hidden shadow-sm">
          {mapEngine === "naver" ? (
            <NaverMapView
              projects={filteredProjects}
              selectedProject={selectedProject}
              onSelectProject={(p) => setSelectedProject(p)}
              selectedDistrict={selectedDistrict}
            />
          ) : (
            <SeoulInteractiveMap
              projects={filteredProjects}
              selectedProject={selectedProject}
              onSelectProject={(p) => setSelectedProject(p)}
              selectedDistrict={selectedDistrict}
            />
          )}
        </div>

        {/* Selected Project Sidebar Card */}
        <div className="space-y-4">
          {selectedProject ? (
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  {selectedProject.current_status ?? "진행 중"}
                </span>
                <span className="text-[11px] text-[#777a76]">{selectedProject.project_type ?? "정비사업"}</span>
              </div>

              <h2 className="mt-2 text-xl font-bold text-[#171918] leading-tight">
                {selectedProject.name}
              </h2>
              <p className="mt-1 text-xs text-[#777a76]">
                {selectedProject.district ?? ""} {selectedProject.address ?? ""}
              </p>

              {/* Quick Specs */}
              {selectedProjectSpecs && (
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-t border-black/5 pt-3">
                  <div className="bg-[#f7f7f4] p-2.5 rounded-xl">
                    <p className="text-[10px] text-[#777a76]">예상 세대수</p>
                    <p className="font-bold text-[#171918] mt-0.5">
                      {selectedProjectSpecs.totalUnits ? `${selectedProjectSpecs.totalUnits.toLocaleString()} 세대` : "정보 확인 중"}
                    </p>
                  </div>
                  <div className="bg-[#f7f7f4] p-2.5 rounded-xl">
                    <p className="text-[10px] text-[#777a76]">계획 용적률</p>
                    <p className="font-bold text-[#171918] mt-0.5">{selectedProjectSpecs.far ?? "-"}</p>
                  </div>
                  <div className="bg-[#f7f7f4] p-2.5 rounded-xl">
                    <p className="text-[10px] text-[#777a76]">시공사</p>
                    <p className="font-bold text-[#171918] mt-0.5 truncate">{selectedProjectSpecs.builder ?? "선정 준비 중"}</p>
                  </div>
                  <div className="bg-[#f7f7f4] p-2.5 rounded-xl">
                    <p className="text-[10px] text-[#777a76]">최고 층수</p>
                    <p className="font-bold text-[#171918] mt-0.5">{selectedProjectSpecs.floors ?? "-"}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-4 flex flex-col gap-2 pt-2 border-t border-black/5">
                <Link
                  href={`/projects/${selectedProject.id}`}
                  className="w-full text-center rounded-xl bg-[#171918] text-white py-2.5 text-xs font-bold hover:bg-black/80 transition shadow-2xs"
                >
                  사업장 상세 정보 & 사업성 시뮬레이터 ➔
                </Link>
                <a
                  href={getNaverMapUrl(selectedProject.district, selectedProject.address, selectedProject.name)}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full text-center rounded-xl border border-emerald-600/30 bg-emerald-50 text-emerald-800 py-2 text-xs font-bold hover:bg-emerald-100 transition shadow-2xs"
                >
                  🗺️ 네이버 지도 앱에서 위치/로드뷰 보기 ↗
                </a>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-black/10 bg-white p-6 text-center text-xs text-[#777a76]">
              지도에서 구역을 클릭하면 상세 정보가 표시됩니다.
            </div>
          )}

          {/* District Projects Count */}
          <div className="rounded-2xl border border-black/8 bg-white p-4 text-xs shadow-2xs">
            <div className="flex items-center justify-between text-[#171918] font-bold">
              <span>표시 중인 사업지</span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {filteredProjects.length}개 구역
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MapPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#171918]">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <Header />
      </div>
      <Suspense fallback={<div className="p-10 text-center text-xs text-[#777a76]">지도를 불러오는 중입니다...</div>}>
        <MapContent />
      </Suspense>
    </main>
  );
}
