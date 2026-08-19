"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";

type EventRow = { id: string; project_id: string; title: string; event_type: string; importance: number; occurred_at: string; source_name: string | null; source_url: string | null; project: { name: string; address: string; project_type: string | null; current_status: string | null } | null };
type Period = "today" | "7d" | "30d" | "all";

function seoulDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

function formatDate(date: string) { return date.replaceAll("-", "."); }
function startDate(period: Period) {
  if (period === "today") return seoulDate();
  if (period === "7d") return seoulDate(-6);
  if (period === "30d") return seoulDate(-29);
  return null;
}

export default function ChangesPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [period, setPeriod] = useState<Period>("7d");
  const [importance, setImportance] = useState("all");
  const [eventType, setEventType] = useState("all");
  const [projectType, setProjectType] = useState("all");
  const [stage, setStage] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadEvents() {
      try {
        const supabase = getSupabaseClient();
        const { data, error: queryError } = await supabase.from("events").select("id,project_id,title,event_type,importance,occurred_at,source_name,source_url,project:projects(name,address,project_type,current_status)").order("occurred_at", { ascending: false }).limit(1000);
        if (queryError) throw queryError;
        setEvents(data as unknown as EventRow[]);
      } catch {
        setError("변화 데이터를 불러오지 못했습니다. Supabase 연결 설정을 확인해 주세요.");
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  const types = useMemo(() => [...new Set(events.map((event) => event.event_type).filter(Boolean))].sort(), [events]);
  const projectTypes = useMemo(() => [...new Set(events.map((event) => event.project?.project_type).filter((value): value is string => Boolean(value)))].sort(), [events]);
  const stages = useMemo(() => [...new Set(events.map((event) => event.project?.current_status).filter((value): value is string => Boolean(value)))].sort(), [events]);
  const filteredEvents = useMemo(() => {
    const from = startDate(period);
    const today = seoulDate();
    return events.filter((event) => (!from || (event.occurred_at >= from && event.occurred_at <= today)) && (importance === "all" || String(event.importance) === importance) && (eventType === "all" || event.event_type === eventType) && (projectType === "all" || event.project?.project_type === projectType) && (stage === "all" || event.project?.current_status === stage));
  }, [eventType, events, importance, period, projectType, stage]);
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const pageEvents = filteredEvents.slice((page - 1) * pageSize, page * pageSize);

  return <main className="min-h-screen bg-[#f7f7f4] text-[#171918]"><div className="mx-auto max-w-5xl px-6 py-10 sm:px-10 sm:py-14">
    <header className="flex items-center justify-between border-b border-black/10 pb-6"><Link className="text-lg font-bold tracking-[-0.06em]" href="/">RE:TRACK</Link><Link className="text-sm text-[#6e716e] underline underline-offset-4" href="/">검색으로 돌아가기</Link></header>
    <section className="pt-14"><p className="text-sm font-semibold tracking-[0.12em] text-[#e6523a]">CHANGE FEED</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">정비사업 변화 전체 보기</h1><p className="mt-4 text-[#6e716e]">공고와 사업 진행 변화를 날짜와 중요도별로 확인하세요.</p></section>
    <section className="mt-10 rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.035)]" aria-label="변화 필터"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm font-medium">기간<select className="mt-2 block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm" value={period} onChange={(event) => { setPeriod(event.target.value as Period); setPage(1); }}><option value="today">오늘</option><option value="7d">최근 7일</option><option value="30d">최근 30일</option><option value="all">전체 기간</option></select></label>
      <label className="text-sm font-medium">중요도<select className="mt-2 block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm" value={importance} onChange={(event) => { setImportance(event.target.value); setPage(1); }}><option value="all">전체</option><option value="3">중요</option><option value="2">일반</option><option value="1">낮음</option></select></label>
      <label className="text-sm font-medium">변화 유형<select className="mt-2 block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm" value={eventType} onChange={(event) => { setEventType(event.target.value); setPage(1); }}><option value="all">전체</option>{types.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
      <label className="text-sm font-medium">사업 유형<select className="mt-2 block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm" value={projectType} onChange={(event) => { setProjectType(event.target.value); setPage(1); }}><option value="all">전체</option>{projectTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
      <label className="text-sm font-medium">현재 단계<select className="mt-2 block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm" value={stage} onChange={(event) => { setStage(event.target.value); setPage(1); }}><option value="all">전체</option>{stages.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
    </div></section>
    <section className="mt-10 pb-10"><div className="mb-5 flex items-end justify-between"><h2 className="text-2xl font-semibold tracking-[-0.04em]">변화 목록</h2><span className="text-sm text-[#777a76]">{loading ? "불러오는 중" : `${filteredEvents.length}건`}</span></div>
      {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</p>}
      {loading && <div className="rounded-2xl bg-white px-5 py-8 text-sm text-[#777a76]">변화 데이터를 불러오는 중입니다...</div>}
      {!loading && !error && filteredEvents.length === 0 && <div className="rounded-2xl bg-white px-5 py-8 text-sm text-[#777a76]">선택한 조건에 맞는 변화가 없습니다.</div>}
      {!loading && !error && filteredEvents.length > 0 && <><div className="overflow-hidden rounded-2xl border border-black/8 bg-white">{pageEvents.map((event) => <article className="border-b border-black/7 px-5 py-5 last:border-0 sm:px-7" key={event.id}><div className="flex gap-3"><span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${event.importance === 3 ? "bg-rose-500" : "bg-orange-400"}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#777a76]"><time>{formatDate(event.occurred_at)}</time><span>{event.event_type}</span>{event.importance === 3 && <span className="font-semibold text-rose-600">중요</span>}</div><Link className="mt-2 block font-semibold leading-6 underline-offset-4 hover:underline" href={`/projects/${event.project_id}`}>{event.project?.name ?? "서울 정비사업"}</Link><p className="mt-1 text-sm text-[#444]">{event.title}</p><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#777a76]"><span>{event.source_name ?? "출처 정보 없음"}</span>{event.source_url && <a className="underline underline-offset-4 hover:text-[#171918]" href={event.source_url} target="_blank" rel="noreferrer">원문 보기</a>}</div></div></div></article>)}</div><nav className="mt-5 flex items-center justify-center gap-3" aria-label="변화 목록 페이지"><button className="rounded-lg border border-black/10 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>이전</button><span className="text-sm text-[#777a76]">{page} / {pageCount}</span><button className="rounded-lg border border-black/10 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>다음</button></nav></>}
    </section>
  </div></main>;
}
