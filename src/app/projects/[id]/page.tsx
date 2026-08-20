import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import SubscriptionButton from "@/components/SubscriptionButton";
import StagePipeline from "@/components/StagePipeline";
import { getSupabaseClient } from "@/lib/supabase/client";
import { calculateStagePipeline } from "@/lib/utils/stages";

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

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#171918]">
      <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10 sm:py-14">
        <Header />

        <section className="pt-14">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-semibold tracking-[0.12em] text-[#e6523a]">PROJECT PROFILE</p>
            <SubscriptionButton projectId={project.id} />
          </div>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">{project.name}</h1>
          <p className="mt-4 text-[#6e716e]">{project.address}</p>

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

        <section className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_1.3fr] items-start">
          {/* 7-Step Stage Pipeline */}
          <div>
            <StagePipeline steps={pipeline} currentStatus={project.current_status} />
          </div>

          {/* Events Timeline */}
          <div>
            <div className="flex items-end justify-between mb-4">
              <h2 className="text-2xl font-semibold tracking-[-0.04em]">변화 타임라인</h2>
              <span className="text-sm text-[#777a76]">총 {events?.length ?? 0}건</span>
            </div>

            <div className="overflow-hidden rounded-3xl border border-black/8 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              {events?.length ? (
                events.map((event, index) => (
                  <article
                    className={`p-5 sm:p-6 transition hover:bg-[#fcfcfa] ${
                      index !== (events.length - 1) ? "border-b border-black/7" : ""
                    }`}
                    key={event.id}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                          event.importance === 3 ? "bg-rose-500" : "bg-orange-400"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#777a76]">
                          <time className="font-mono">{event.occurred_at.replaceAll("-", ".")}</time>
                          <span className="rounded bg-black/5 px-2 py-0.5 font-medium text-[#171918]">
                            {event.event_type}
                          </span>
                          {event.importance === 3 && (
                            <span className="font-bold text-rose-600">중요 인가/고시</span>
                          )}
                        </div>

                        <h3 className="mt-2 font-bold leading-6 text-[#171918]">{event.title}</h3>

                        {/* AI Summary Highlight */}
                        {event.importance === 3 && (
                          <div className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-xs text-[#333]">
                            <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1">
                              <span>💡 AI 핵심 변경점 요약</span>
                              <span className="rounded bg-amber-200/80 px-1 py-0.2 text-[10px] text-amber-900">Pro</span>
                            </div>
                            <p className="text-[#555] leading-relaxed">
                              • 본 사업장의 {event.title.includes("인가") ? "인가 절차" : "정비계획 변경"}가 서울시/구청에 공식 고시되었습니다.<br />
                              • 자세한 세대수 및 구역 면적 변경은 아래 원문 링크에서 확인하실 수 있습니다.
                            </p>
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#777a76]">
                          <span>{event.source_name ?? "출처 정보 없음"}</span>
                          {event.source_url && (
                            <a
                              className="font-medium underline underline-offset-4 hover:text-[#171918]"
                              href={event.source_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              공고 원문 보기 ↗
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <p className="p-8 text-center text-sm text-[#777a76]">등록된 변화 기록이 없습니다.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

