"use client";

import { useEffect, useState } from "react";
import { NewsItem } from "@/lib/services/news";

const CATEGORY_COLORS: Record<NewsItem["category"], string> = {
  "정책/규제": "bg-blue-50 text-blue-800 border-blue-200/80",
  "구역 동향": "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  "신속통합": "bg-amber-50 text-amber-900 border-amber-200/80",
  "시장 분석": "bg-purple-50 text-purple-800 border-purple-200/80",
};

export default function NewsSection() {
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNews() {
      try {
        const res = await fetch("/api/news");
        if (!res.ok) throw new Error("Failed to fetch news");
        const data = await res.json();
        setNewsList(data.news ?? []);
      } catch (e) {
        console.error("News load error:", e);
      } finally {
        setLoading(false);
      }
    }
    loadNews();
  }, []);

  return (
    <section className="mt-16 sm:mt-20">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-[0.12em] text-[#e6523a]">REAL ESTATE NEWS</span>
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              실시간
            </span>
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl text-[#171918]">
            주요 재개발·재건축 뉴스 & 정책 브리핑
          </h2>
          <p className="mt-1 text-xs text-[#777a76]">
            서울시 정비사업 인가 동향, 신속통합기획 및 주요 구역 언론 보도를 실시간으로 모아봅니다.
          </p>
        </div>
      </div>

      {/* News Cards Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 rounded-3xl bg-black/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {newsList.map((item) => (
            <a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noreferrer"
              className="group flex flex-col justify-between rounded-3xl border border-black/8 bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_12px_36px_rgb(0,0,0,0.06)]"
            >
              <div>
                {/* Meta Top: Category + Source + Date */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                        CATEGORY_COLORS[item.category]
                      }`}
                    >
                      {item.category}
                    </span>
                    <span className="font-semibold text-[#171918]">{item.source}</span>
                  </div>
                  <time className="text-[11px] text-[#777a76]">{item.publishedAt}</time>
                </div>

                {/* News Title */}
                <h3 className="mt-3 font-bold text-sm leading-snug text-[#171918] line-clamp-2 group-hover:text-[#e6523a] transition">
                  {item.title}
                </h3>
              </div>

              {/* Bottom Action */}
              <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-3 text-xs text-[#777a76]">
                <span className="text-[11px]">언론사 기사 전문</span>
                <span className="font-semibold text-[#171918] group-hover:underline flex items-center gap-0.5">
                  <span>원문 보기</span>
                  <span>↗</span>
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
