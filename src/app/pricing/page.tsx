"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabaseClient } from "@/lib/supabase/client";

const FAQ_LIST = [
  {
    q: "카카오 알림톡은 언제 발송되나요?",
    a: "등록하신 관심 사업장에 서울시보나 자치구청의 정비계획 변경, 조합설립인가, 사업시행인가, 관리처분인가 등 고시공고가 등록되는 즉시(10분 이내) 카카오 알림톡으로 전송됩니다.",
  },
  {
    q: "AI 3줄 요약은 어떤 정보를 분석해주나요?",
    a: "수십 페이지에 달하는 행정 고시문 PDF에서 '용적률/건폐율 변동', '총 세대수 및 조합원 분양 세대', '비례율 및 공사비 변동' 등 투자자와 조합원에게 가장 중요한 핵심 수치만을 3줄로 자동 정제하여 제공합니다.",
  },
  {
    q: "언제든지 구독을 취소하거나 변경할 수 있나요?",
    a: "네, 마이페이지에서 언제든지 위약금 없이 원클릭으로 구독을 해지할 수 있습니다. 해지하시더라도 결제하신 구독 기간까지는 Pro 혜택이 정상 유지됩니다.",
  },
  {
    q: "공인중개사나 법인용 세금계산서 발행이 가능한가요?",
    a: "네, Business 플랜 구독 시 사업자등록번호를 입력하시면 전자세금계산서 또는 지출증빙용 현금영수증이 매월 자동 발행됩니다.",
  },
];

export default function PricingPage() {
  const { user, openLoginModal } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [activating, setActivating] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubscribe = async (tier: "pro" | "business") => {
    if (!user) {
      openLoginModal("/pricing");
      return;
    }

    setActivating(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("users")
        .update({
          tier: tier,
          subscription_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      setSuccessMessage(`${tier.toUpperCase()} 멤버십이 활성화되었습니다! 내 관심 사업장에서 혜택을 확인해보세요.`);
    } catch (e) {
      console.error("Plan upgrade error:", e);
    } finally {
      setActivating(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#171918]">
      <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10 sm:py-14">
        <Header />

        {/* Hero Section */}
        <section className="pt-14 text-center">
          <p className="text-sm font-semibold tracking-[0.12em] text-[#e6523a]">MEMBERSHIP PRICING</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
            서울 정비사업의 결정적 순간을<br className="hidden sm:inline" /> 가장 빠르게 선점하세요.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-[#6e716e]">
            수억 원의 자산이 걸린 재개발·재건축 인가 고시, 지자체 사이트를 헤매지 않고 실시간 카카오 알림톡과 AI 3줄 요약으로 확인하세요.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-8 inline-flex items-center rounded-2xl bg-black/5 p-1.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-xl px-4 py-2 transition ${
                billingCycle === "monthly" ? "bg-white text-[#171918] shadow-sm" : "text-[#777a76] hover:text-[#171918]"
              }`}
            >
              월간 결제
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 transition ${
                billingCycle === "yearly" ? "bg-white text-[#171918] shadow-sm" : "text-[#777a76] hover:text-[#171918]"
              }`}
            >
              <span>연간 결제</span>
              <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] text-white">20% 할인</span>
            </button>
          </div>
        </section>

        {successMessage && (
          <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm font-semibold text-emerald-800">
            🎉 {successMessage}
          </div>
        )}

        {/* Pricing Cards Grid */}
        <section className="mt-12 grid gap-6 md:grid-cols-3">
          {/* Plan 1: Free */}
          <div className="flex flex-col justify-between rounded-3xl border border-black/8 bg-white p-7 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-[#171918]">Free</h3>
                <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-semibold text-[#777a76]">무료 탐색</span>
              </div>
              <p className="mt-2 text-xs text-[#777a76]">정비사업장 기본 정보와 공고를 가볍게 둘러보는 분을 위한 플랜</p>

              <div className="mt-6 border-b border-black/5 pb-6">
                <span className="text-3xl font-bold tracking-tight">₩0</span>
                <span className="text-xs text-[#777a76] ml-1">/ 평생 무료</span>
              </div>

              <ul className="mt-6 space-y-3 text-xs text-[#444]">
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>서울 25개 자치구 정비사업장 검색</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>최신 공고·변동 피드 조회</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>관심 사업장 <strong>최대 3개</strong> 등록</span>
                </li>
                <li className="flex items-center gap-2.5 text-[#999]">
                  <span>✕</span>
                  <span>실시간 카카오 알림톡 (미지원)</span>
                </li>
                <li className="flex items-center gap-2.5 text-[#999]">
                  <span>✕</span>
                  <span>AI 고시문 3줄 요약 (미지원)</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              disabled
              className="mt-8 w-full rounded-2xl border border-black/10 bg-[#f7f7f4] py-3 text-xs font-semibold text-[#777a76]"
            >
              기본 제공 플랜
            </button>
          </div>

          {/* Plan 2: Pro (Featured) */}
          <div className="relative flex flex-col justify-between rounded-3xl border-2 border-[#171918] bg-white p-7 shadow-[0_12px_40px_rgb(0,0,0,0.08)]">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#171918] px-3.5 py-1 text-xs font-bold text-white shadow-sm">
              ⭐ 가장 인기 (추천)
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-[#171918]">Pro</h3>
                <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-[#e6523a]">투자자 / 조합원</span>
              </div>
              <p className="mt-2 text-xs text-[#777a76]">변동 공고를 놓치지 않고 가장 먼저 캐치하는 개인 필수 플랜</p>

              <div className="mt-6 border-b border-black/5 pb-6">
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold tracking-tight">
                    {billingCycle === "yearly" ? "₩11,900" : "₩14,900"}
                  </span>
                  <span className="text-xs text-[#777a76] ml-1">/ 월</span>
                </div>
                {billingCycle === "yearly" && (
                  <p className="mt-1 text-[11px] text-[#e6523a]">연 142,800원 (연 36,000원 할인 적용)</p>
                )}
              </div>

              <ul className="mt-6 space-y-3 text-xs text-[#171918]">
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>관심 사업장 <strong>무제한 등록</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>중요 인가/고시 <strong>실시간 카카오 알림톡</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>수십 장짜리 고시공고 <strong>AI 3줄 핵심 요약</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>서울 주요 뉴타운(노량진, 성수, 한남 등) 묶음 모니터링</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>정비사업 추진단계 및 인가 캘린더</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => handleSubscribe("pro")}
              disabled={activating}
              className="mt-8 w-full rounded-2xl bg-[#171918] py-3.5 text-xs font-semibold text-white transition hover:bg-black active:scale-[0.98]"
            >
              {activating ? "활성화 중..." : "Pro 멤버십 시작하기 (7일 무료 체험) ➔"}
            </button>
          </div>

          {/* Plan 3: Business */}
          <div className="flex flex-col justify-between rounded-3xl border border-black/8 bg-white p-7 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-[#171918]">Business</h3>
                <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-semibold text-[#777a76]">공인중개사 / 법인</span>
              </div>
              <p className="mt-2 text-xs text-[#777a76]">고객 브리핑 및 서울 전역 정비사업 모니터링이 필요한 전문 기업용</p>

              <div className="mt-6 border-b border-black/5 pb-6">
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold tracking-tight">
                    {billingCycle === "yearly" ? "₩47,000" : "₩59,000"}
                  </span>
                  <span className="text-xs text-[#777a76] ml-1">/ 월</span>
                </div>
                {billingCycle === "yearly" && (
                  <p className="mt-1 text-[11px] text-[#e6523a]">연 564,000원 (연 144,000원 할인 적용)</p>
                )}
              </div>

              <ul className="mt-6 space-y-3 text-xs text-[#444]">
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>Pro 플랜의 모든 기능</strong> 포함</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>서울 4,000개 전 구역 일괄 모니터링</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>고객 브리핑용 사업장 타임라인 PDF 리포트</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>정비사업 공고/단계 원본 데이터 엑셀(CSV) 다운로드</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>세금계산서 발행 및 VIP 전담 지원</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => handleSubscribe("business")}
              disabled={activating}
              className="mt-8 w-full rounded-2xl border border-black/15 bg-white py-3.5 text-xs font-semibold text-[#171918] transition hover:bg-[#f7f7f4] active:scale-[0.98]"
            >
              {activating ? "활성화 중..." : "Business 플랜 시작하기"}
            </button>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mt-24 pb-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">자주 묻는 질문</h2>
            <p className="mt-2 text-sm text-[#777a76]">궁금하신 점이 있다면 아래 답변을 확인해 보세요.</p>
          </div>

          <div className="mx-auto mt-8 max-w-3xl space-y-4">
            {FAQ_LIST.map((faq) => (
              <div key={faq.q} className="rounded-2xl border border-black/8 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                <h3 className="font-bold text-sm text-[#171918]">Q. {faq.q}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#6e716e]">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
