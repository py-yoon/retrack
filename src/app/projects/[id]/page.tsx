import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

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

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#171918]">
      <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10 sm:py-14">
        <header className="flex items-center justify-between border-b border-black/10 pb-6">
          <Link className="text-lg font-bold tracking-[-0.06em]" href="/">RE:TRACK</Link>
          <Link className="text-sm text-[#6e716e] underline underline-offset-4" href="/">검색으로 돌아가기</Link>
        </header>

        <section className="pt-14">
          <p className="text-sm font-semibold tracking-[0.12em] text-[#e6523a]">PROJECT PROFILE</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">{project.name}</h1>
          <p className="mt-4 text-[#6e716e]">{project.address}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-white p-5">
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
            <div className="rounded-2xl bg-white p-5"><p className="text-xs text-[#777a76]">현재 단계</p><p className="mt-2 font-semibold">{project.current_status ?? "확인 중"}</p></div>
            <div className="rounded-2xl bg-white p-5"><p className="text-xs text-[#777a76]">사업 유형</p><p className="mt-2 font-semibold">{project.project_type ?? "정비사업"}</p></div>
            <div className="rounded-2xl bg-white p-5"><p className="text-xs text-[#777a76]">업데이트</p><p className="mt-2 font-semibold">{project.updated_at.slice(0, 10).replaceAll("-", ".")}</p></div>
          </div>
        </section>

        <section className="mt-14 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.04em]">추진 단계</h2>
            <div className="mt-5 rounded-2xl bg-white p-5">
              {stages?.length ? stages.map((stage) => <div className="flex items-center gap-3 border-b border-black/7 py-4 last:border-0" key={stage.id}>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="flex-1 font-medium">{stage.stage_name}</span>
                {stage.approved_at && <time className="text-sm text-[#777a76]">{stage.approved_at.replaceAll("-", ".")}</time>}
              </div>) : <p className="py-5 text-sm text-[#777a76]">등록된 추진 단계가 없습니다.</p>}
            </div>
          </div>
          <div>
            <div className="flex items-end justify-between"><h2 className="text-2xl font-semibold tracking-[-0.04em]">변화 타임라인</h2><span className="text-sm text-[#777a76]">{events?.length ?? 0}건</span></div>
            <div className="mt-5 rounded-2xl bg-white px-5 sm:px-7">
              {events?.length ? events.map((event) => <article className="relative border-b border-black/7 py-5 last:border-0" key={event.id}>
                <div className="flex items-start gap-3"><span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${event.importance === 3 ? "bg-rose-500" : "bg-orange-400"}`} /><div><time className="text-xs text-[#777a76]">{event.occurred_at.replaceAll("-", ".")}</time><h3 className="mt-1 font-semibold leading-6">{event.title}</h3><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#777a76]"><span>{event.source_name ?? "출처 정보 없음"}</span>{event.source_url && <a className="underline underline-offset-4 hover:text-[#171918]" href={event.source_url} target="_blank" rel="noreferrer">원문 보기</a>}</div></div></div>
              </article>) : <p className="py-5 text-sm text-[#777a76]">등록된 변화가 없습니다.</p>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
