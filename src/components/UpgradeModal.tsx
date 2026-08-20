"use client";

import Link from "next/link";

type UpgradeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
};

export default function UpgradeModal({
  isOpen,
  onClose,
  title = "관심 사업장은 최대 3개까지 무료입니다",
  description = "Pro 멤버십으로 업그레이드하고 관심 사업장 무제한 등록 및 실시간 카카오 알림톡, AI 고시문 3줄 요약 혜택을 누려보세요.",
}: UpgradeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-black/10 bg-white p-7 text-left shadow-2xl transition-all sm:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-[#777a76] hover:bg-black/5 hover:text-black"
        >
          ✕
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-2xl text-amber-600">
          👑
        </div>

        <h3 className="mt-4 text-xl font-bold tracking-tight text-[#171918]">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[#6e716e]">{description}</p>

        {/* Benefits List */}
        <div className="mt-6 rounded-2xl bg-[#f7f7f4] p-4 text-xs space-y-2.5 text-[#333]">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 font-bold">✓</span>
            <span className="font-semibold">관심 정비사업장 무제한 등록</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 font-bold">✓</span>
            <span>중요 인가/고시 발생 시 <strong>실시간 카카오 알림톡 발송</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 font-bold">✓</span>
            <span>수십 장짜리 고시공고 <strong>AI 핵심 변경점 3줄 요약</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 font-bold">✓</span>
            <span>서울 주요 뉴타운(노량진, 성수, 한남 등) 묶음 모니터링</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <Link
            href="/pricing"
            onClick={onClose}
            className="flex items-center justify-center rounded-2xl bg-[#171918] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-black active:scale-[0.98]"
          >
            Pro 요금제 알아보기 (월 14,900원) ➔
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl py-2 text-xs font-medium text-[#777a76] hover:text-black"
          >
            다음에 하기
          </button>
        </div>
      </div>
    </div>
  );
}
