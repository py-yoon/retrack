"use client";

import dynamic from "next/dynamic";
import type { Coord } from "@/lib/data/project-polygons";

const ProjectDetailMap = dynamic(
  () => import("@/components/ProjectDetailMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[380px] bg-[#f5f5f1] rounded-2xl text-xs text-[#777a76] animate-pulse border border-black/5">
        🗺️ 네이버 지도 및 구역 폴리곤을 로드하는 중입니다...
      </div>
    ),
  }
);

type ProjectMapSectionProps = {
  projectId: string;
  projectName: string;
  district: string | null;
  address: string | null;
  currentStatus: string | null;
  projectType: string | null;
  center: Coord;
  polygon: Coord[];
};

export default function ProjectMapSection(props: ProjectMapSectionProps) {
  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold tracking-tight text-[#171918]">🗺️ 구역 위치 및 지적도</h2>
          <span className="text-xs font-medium text-[#777a76]">네이버 지도 구역 폴리곤</span>
        </div>
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
          실시간 지도 연동
        </span>
      </div>
      <ProjectDetailMap {...props} />
    </section>
  );
}
