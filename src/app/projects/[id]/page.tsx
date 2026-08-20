import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import SubscriptionButton from "@/components/SubscriptionButton";
import StagePipeline from "@/components/StagePipeline";
import ProjectSpecsCard from "@/components/ProjectSpecsCard";
import FeasibilityCalculator from "@/components/FeasibilityCalculator";
import ProjectEventsTimeline from "@/components/ProjectEventsTimeline";
import { getSupabaseClient } from "@/lib/supabase/client";
import { calculateStagePipeline } from "@/lib/utils/stages";
import { getNaverMapUrl } from "@/lib/utils/map";

type ProjectPageProps = { params: Promise<{ id: string }> };

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const supabase = getSupabaseClient();
  const [{ data: project }, { data: events }, { data: stages }] = await Promise.all([
    supabase.from("projects").select("id,name,address,district,project_type,current_status,updated_at").eq("id", id).maybeSingle(),
    supabase.from("events").select("id,title,event_type,importance,occurred_at,source_name,source_url").eq("project_id", id).order("occurred_at", { ascending: false }),
    supabase.from("project_stages").select("id,stage_name,stage_order,approved_at").eq("project_id", id).order("stage_order"),
  ]);

  if (!project) notFound();

  const pipeline = calculateStagePipeline(
    project.current_status,
    stages,
    events
  );

  const naverMapUrl = getNaverMapUrl(project.district, project.address, project.name);

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#171918]">
      <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10 sm:py-14">
        <Header />

        {/* Project Header Profile */}
        <section className="pt-14">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-semibold tracking-[0.12em] text-[#e6523a]">PROJECT PROFILE</p>
            <SubscriptionButton projectId={project.id} />
          </div>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">{project.name}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="text-[#6e716e]">{project.address}</p>
            <a
              href={naverMapUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600/20 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 shadow-2xs"
            >
              <span className="text-sm">🗺️</span>
              <span>네이버 지도로 위치 보기 ↗</span>
            </a>
            <Link
              href={`/compare?p1=${project.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-1 text-xs font-bold text-[#171918] transition hover:bg-[#f7f7f4] shadow-2xs"
            >
              <span>⚔️</span>
              <span>다른 구역과 1:1 비교하기 ➔</span>
            </Link>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-black/8 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              <p className="text-xs text-[#777a76]">자치구</p>
              <p className="mt-2 font-semibold">
                {project.district ? (
                  <Link
                    href={`/changes?district=${encodeURIComponent(project.district)}`}
                    className="underline-offset-4 hover:underline hover:text-[#e6523a]"
                  >
                    {project.district} ↗
                  </Link>
                ) : (
                  "서울시"
                )}
              </p>
            </div>
            <div className="rounded-2xl border border-black/8 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              <p className="text-xs text-[#777a76]">현재 단계</p>
              <p className="mt-2 font-semibold text-emerald-700">{project.current_status ?? "확인 중"}</p>
            </div>
            <div className="rounded-2xl border border-black/8 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              <p className="text-xs text-[#777a76]">사업 유형</p>
              <p className="mt-2 font-semibold">{project.project_type ?? "정비사업"}</p>
            </div>
            <div className="rounded-2xl border border-black/8 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              <p className="text-xs text-[#777a76]">업데이트</p>
              <p className="mt-2 font-semibold">{project.updated_at.slice(0, 10).replaceAll("-", ".")}</p>
            </div>
          </div>
        </section>

        {/* Section 1: Specs & Architectural Design */}
        <section className="mt-10">
          <ProjectSpecsCard
            projectName={project.name}
            district={project.district}
            projectType={project.project_type}
            currentStatus={project.current_status}
          />
        </section>

        {/* Section 2: Feasibility & Additional Contribution ROI Simulator */}
        <section className="mt-10">
          <FeasibilityCalculator
            projectName={project.name}
            district={project.district}
            projectType={project.project_type}
            currentStatus={project.current_status}
          />
        </section>

        {/* Section 3: Stage Pipeline & Events Timeline */}
        <section className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_1.3fr] items-start">
          {/* 7-Step Stage Pipeline */}
          <div>
            <StagePipeline steps={pipeline} currentStatus={project.current_status} />
          </div>

          {/* Events Timeline with Load More */}
          <div>
            <ProjectEventsTimeline events={events ?? []} />
          </div>
        </section>
      </div>
    </main>
  );
}

