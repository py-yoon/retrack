"use client";

import { useState } from "react";

export type EventItem = {
  id: string;
  title: string;
  event_type: string;
  importance: number;
  occurred_at: string;
  source_name: string | null;
  source_url: string | null;
};

type ProjectEventsTimelineProps = {
  events: EventItem[];
};

const INITIAL_COUNT = 4;
const STEP_COUNT = 5;

export default function ProjectEventsTimeline({ events }: ProjectEventsTimelineProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const [onlyImportant, setOnlyImportant] = useState(false);

  const filteredEvents = onlyImportant
    ? events.filter((e) => e.importance === 3)
    : events;

  const displayedEvents = filteredEvents.slice(0, visibleCount);
  const hasMore = visibleCount < filteredEvents.length;
  const isExpanded = visibleCount > INITIAL_COUNT && visibleCount >= filteredEvents.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(filteredEvents.length, prev + STEP_COUNT));
  };

  const handleCollapse = () => {
    setVisibleCount(INITIAL_COUNT);
  };

  return (
    <div>
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-2xl font-semibold tracking-[-0.04em]">변화 타임라인</h2>
          <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-semibold text-[#666]">
            총 {events.length}건
          </span>
        </div>

        {events.some((e) => e.importance === 3) && (
          <button
            type="button"
            onClick={() => {
              setOnlyImportant(!onlyImportant);
              setVisibleCount(INITIAL_COUNT);
            }}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              onlyImportant
                ? "bg-rose-50 border border-rose-200 text-rose-700"
                : "bg-white border border-black/10 text-[#666] hover:bg-[#f7f7f4]"
            }`}
          >
            {onlyImportant ? "✓ 중요 공고만 보는 중" : "중요 인가만 필터"}
          </button>
        )}
      </div>

      {/* Events List Box */}
      <div className="overflow-hidden rounded-3xl border border-black/8 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        {displayedEvents.length > 0 ? (
          <>
            <div className="divide-y divide-black/7">
              {displayedEvents.map((event) => (
                <article
                  className="p-5 sm:p-6 transition hover:bg-[#fcfcfa]"
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
                            <span className="rounded bg-amber-200/80 px-1 py-0.2 text-[10px] text-amber-900">핵심</span>
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
              ))}
            </div>

            {/* Load More / Collapse Button */}
            {(hasMore || isExpanded) && (
              <div className="border-t border-black/7 bg-[#fcfcfa] p-4 text-center">
                {hasMore ? (
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-5 py-2.5 text-xs font-bold text-[#171918] shadow-xs transition hover:bg-[#f7f7f4] active:scale-[0.98]"
                  >
                    <span>변화 타임라인 더보기</span>
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-semibold text-[#777a76]">
                      {filteredEvents.length - visibleCount}건 남음 ∨
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCollapse}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-5 py-2 text-xs font-semibold text-[#555] transition hover:bg-[#f7f7f4]"
                  >
                    <span>접기 (최근 {INITIAL_COUNT}건만 보기 ∧)</span>
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="p-8 text-center text-sm text-[#777a76]">
            {onlyImportant ? "중요 인가/고시로 분류된 공고가 없습니다." : "등록된 변화 기록이 없습니다."}
          </p>
        )}
      </div>
    </div>
  );
}
