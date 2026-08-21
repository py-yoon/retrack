"use client";

import { useState, useId } from "react";

type FeasibilityCalculatorProps = {
  projectName: string;
  district: string | null;
  projectType: string | null;
  currentStatus: string | null;
};

// District benchmark prices (조합원 분양가 및 인근 대장 신축 시세 기준값 - 단위: 억원)
const DISTRICT_BENCHMARKS: Record<string, { p59: number; p84: number; p114: number; marketPrice84: number; nearbyNewName: string }> = {
  강남구: { p59: 13.5, p84: 18.5, p114: 25.0, marketPrice84: 31.0, nearbyNewName: "디에이치 퍼스티어 아이파크" },
  서초구: { p59: 13.0, p84: 18.0, p114: 24.5, marketPrice84: 30.0, nearbyNewName: "래미안 원베일리" },
  송파구: { p59: 10.0, p84: 14.0, p114: 19.5, marketPrice84: 23.0, nearbyNewName: "헬리오시티" },
  용산구: { p59: 11.0, p84: 16.0, p114: 22.0, marketPrice84: 26.0, nearbyNewName: "용산 센트럴파크 해링턴" },
  성동구: { p59: 9.0, p84: 12.8, p114: 17.5, marketPrice84: 20.5, nearbyNewName: "트리마제 / 아크로서울포레스트" },
  마포구: { p59: 8.5, p84: 12.0, p114: 16.5, marketPrice84: 18.5, nearbyNewName: "마포래미안푸르지오" },
  동작구: { p59: 8.0, p84: 11.2, p114: 15.2, marketPrice84: 17.0, nearbyNewName: "아크로리버하임" },
  영등포구: { p59: 7.8, p84: 11.0, p114: 15.0, marketPrice84: 16.5, nearbyNewName: "아크로타워스퀘어" },
  양천구: { p59: 8.0, p84: 11.5, p114: 15.5, marketPrice84: 17.5, nearbyNewName: "목동 센트럴아이파크위브" },
  광진구: { p59: 7.8, p84: 11.0, p114: 15.0, marketPrice84: 16.5, nearbyNewName: "롯데캐슬 이스트폴" },
  강동구: { p59: 7.2, p84: 10.2, p114: 14.0, marketPrice84: 15.5, nearbyNewName: "올림픽파크포레온" },
  동대문구: { p59: 6.8, p84: 9.5, p114: 13.0, marketPrice84: 14.0, nearbyNewName: "래미안 라그란데" },
  성북구: { p59: 6.2, p84: 8.8, p114: 12.2, marketPrice84: 12.8, nearbyNewName: "래미안 길음 센터피스" },
  서대문구: { p59: 6.8, p84: 9.6, p114: 13.2, marketPrice84: 14.2, nearbyNewName: "e편한세상 신촌" },
  은평구: { p59: 6.0, p84: 8.4, p114: 11.5, marketPrice84: 12.0, nearbyNewName: "북한산 힐스테이트" },
  관악구: { p59: 6.2, p84: 8.8, p114: 12.2, marketPrice84: 12.5, nearbyNewName: "e편한세상 서울대입구" },
  구로구: { p59: 5.8, p84: 8.0, p114: 11.0, marketPrice84: 11.0, nearbyNewName: "신도림 디큐브시티" },
  금천구: { p59: 5.5, p84: 7.5, p114: 10.2, marketPrice84: 10.2, nearbyNewName: "롯데캐슬 골드파크" },
  중랑구: { p59: 5.8, p84: 7.8, p114: 10.8, marketPrice84: 10.5, nearbyNewName: "사가정 센트럴아이파크" },
  강북구: { p59: 5.8, p84: 7.8, p114: 10.8, marketPrice84: 10.5, nearbyNewName: "꿈의숲 효성해링턴" },
  도봉구: { p59: 5.2, p84: 7.2, p114: 10.0, marketPrice84: 9.8, nearbyNewName: "창동 삼성래미안" },
  노원구: { p59: 5.8, p84: 8.0, p114: 11.0, marketPrice84: 11.0, nearbyNewName: "노원 센트럴푸르지오" },
};

const DEFAULT_BENCHMARK = { p59: 7.2, p84: 10.2, p114: 14.0, marketPrice84: 15.0, nearbyNewName: "인근 신축 대장 아파트" };

export default function FeasibilityCalculator({
  projectName,
  district,
}: FeasibilityCalculatorProps) {
  const buyPriceId = useId();
  const benchmark = (district && DISTRICT_BENCHMARKS[district]) || DEFAULT_BENCHMARK;

  // Calculation Mode: "simple" (총 매수가) vs "detailed" (감정평가액 + 프리미엄 P)
  const [calcMode, setCalcMode] = useState<"simple" | "detailed">("detailed");

  // State: Detailed mode inputs
  const [appraisedValue, setAppraisedValue] = useState<number>(3.5); // 감정평가액 (억원)
  const [premiumP, setPremiumP] = useState<number>(2.0); // 프리미엄 P (억원)

  // State: Simple mode input (초기 총 매수가)
  const [purchasePrice, setPurchasePrice] = useState<number>(5.5);

  // State: Target Unit Type (59 / 84 / 114)
  const [targetType, setTargetType] = useState<"59" | "84" | "114">("84");

  // State: Expected Proportional Ratio (비례율 %)
  const [ratio, setRatio] = useState<number>(100);

  // State: Expected Future Market Price (입주 시 예상 매매가 억원)
  const [expectedFuturePrice, setExpectedFuturePrice] = useState<number>(() => benchmark.marketPrice84);

  // Member price per type (억원)
  const memberPrice = targetType === "59" ? benchmark.p59 : targetType === "84" ? benchmark.p84 : benchmark.p114;

  // Effective Appraised Value (감평가) & Total Buy Price
  const effectiveAppraised = calcMode === "detailed" ? appraisedValue : purchasePrice * 0.65;
  const effectiveBuyPrice = calcMode === "detailed" ? (appraisedValue + premiumP) : purchasePrice;

  // 1. Right Value (추정 권리가액) = 감정평가액 * (비례율 / 100)
  const rightValue = effectiveAppraised * (ratio / 100);

  // 2. Additional Contribution (예상 추가분담금) = 조합원 분양가 - 권리가액
  const contribution = memberPrice - rightValue;

  // 3. Total Investment (총 취득원가) = 매수가격 + 추가분담금 (또는 조합원분양가 + P)
  const totalInvestment = effectiveBuyPrice + contribution;

  // 4. Expected Profit (예상 안전마진 / 시세차익) = 입주 시 예상시세 - 총 취득원가
  const expectedProfit = expectedFuturePrice - totalInvestment;

  // 5. Expected ROI (%) = (예상 시세차익 / 총 실투자금액) * 100
  const expectedRoi = totalInvestment > 0 ? (expectedProfit / totalInvestment) * 100 : 0;

  const handleTypeChange = (type: "59" | "84" | "114") => {
    setTargetType(type);
    if (type === "59") {
      setExpectedFuturePrice(Number((benchmark.marketPrice84 * 0.78).toFixed(1)));
    } else if (type === "84") {
      setExpectedFuturePrice(benchmark.marketPrice84);
    } else {
      setExpectedFuturePrice(Number((benchmark.marketPrice84 * 1.35).toFixed(1)));
    }
  };

  return (
    <div className="rounded-3xl border border-black/8 bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🧮</span>
            <h2 className="text-xl font-bold tracking-tight text-[#171918]">
              예상 분담금 & P(프리미엄) 안전마진 시뮬레이터
            </h2>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
              PRO 시뮬레이션
            </span>
          </div>
          <p className="mt-1 text-xs text-[#777a76]">
            {projectName} 매수 시 감정평가액, 프리미엄(P), 비례율 변동에 따른 <strong>실제 추가분담금과 입주 시 예상 차익</strong>을 실시간 계산합니다.
          </p>
        </div>

        {/* Mode Switch */}
        <div className="flex items-center rounded-xl bg-gray-100 p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setCalcMode("detailed")}
            className={`px-3 py-1.5 rounded-lg transition ${
              calcMode === "detailed" ? "bg-white text-[#171918] shadow-xs" : "text-gray-500 hover:text-black"
            }`}
          >
            정밀 계산 (감평가+P)
          </button>
          <button
            type="button"
            onClick={() => setCalcMode("simple")}
            className={`px-3 py-1.5 rounded-lg transition ${
              calcMode === "simple" ? "bg-white text-[#171918] shadow-xs" : "text-gray-500 hover:text-black"
            }`}
          >
            간편 계산 (총매수가)
          </button>
        </div>
      </div>

      {/* Main Calculator Body */}
      <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_1.2fr] items-start">
        {/* Left: Interactive Sliders & Inputs */}
        <div className="space-y-5">
          {/* Target Type Selector */}
          <div>
            <label className="text-xs font-semibold text-[#171918] block mb-2">
              1. 분양 희망 평형 선택
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange("59")}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition text-center ${
                  targetType === "59"
                    ? "bg-[#171918] text-white border-[#171918] shadow-xs"
                    : "bg-[#f7f7f4] border-black/5 text-[#555] hover:bg-black/5"
                }`}
              >
                <div>전용 59㎡ (25평)</div>
                <div className="text-[10px] opacity-80 mt-0.5">조합원 {benchmark.p59}억</div>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange("84")}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition text-center ${
                  targetType === "84"
                    ? "bg-[#171918] text-white border-[#171918] shadow-xs"
                    : "bg-[#f7f7f4] border-black/5 text-[#555] hover:bg-black/5"
                }`}
              >
                <div>전용 84㎡ (34평)</div>
                <div className="text-[10px] opacity-80 mt-0.5">조합원 {benchmark.p84}억</div>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange("114")}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition text-center ${
                  targetType === "114"
                    ? "bg-[#171918] text-white border-[#171918] shadow-xs"
                    : "bg-[#f7f7f4] border-black/5 text-[#555] hover:bg-black/5"
                }`}
              >
                <div>전용 114㎡ (45평)</div>
                <div className="text-[10px] opacity-80 mt-0.5">조합원 {benchmark.p114}억</div>
              </button>
            </div>
          </div>

          {/* Detailed Mode: Appraised Value & Premium */}
          {calcMode === "detailed" ? (
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  감정평가액 (억원)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="50"
                    value={appraisedValue}
                    onChange={(e) => setAppraisedValue(Number(e.target.value) || 0)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-[#171918]"
                  />
                  <span className="text-xs font-bold text-gray-500">억</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  프리미엄 P (억원)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="30"
                    value={premiumP}
                    onChange={(e) => setPremiumP(Number(e.target.value) || 0)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-emerald-700"
                  />
                  <span className="text-xs font-bold text-gray-500">억</span>
                </div>
              </div>
              <div className="col-span-2 text-[11px] text-gray-500">
                💡 초기 총 매수금액: <strong className="text-black">{(appraisedValue + premiumP).toFixed(1)}억원</strong> (감평가 {appraisedValue}억 + P {premiumP}억)
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor={buyPriceId} className="text-xs font-semibold text-[#171918]">
                  2. 초기 매수가격 (매물 호가)
                </label>
                <span className="font-mono text-sm font-bold text-blue-600">
                  {purchasePrice.toFixed(1)} 억원
                </span>
              </div>
              <input
                id={buyPriceId}
                type="range"
                min="1.0"
                max="30.0"
                step="0.5"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer h-2 bg-gray-200 rounded-lg"
              />
            </div>
          )}

          {/* Proportional Ratio Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#171918]">
                사업 비례율 (Proportional Ratio)
              </label>
              <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                ratio >= 105 ? "bg-emerald-100 text-emerald-800" : ratio < 95 ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"
              }`}>
                {ratio}% {ratio > 100 ? "(사업성 우수)" : ratio < 100 ? "(사업비 증가)" : "(기준)"}
              </span>
            </div>
            <input
              type="range"
              min="75"
              max="135"
              step="1"
              value={ratio}
              onChange={(e) => setRatio(parseInt(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer h-2 bg-gray-200 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>75% (최악)</span>
              <span>100% (기본)</span>
              <span>135% (최상)</span>
            </div>
          </div>

          {/* Future Market Price Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#171918]">
                입주 시점 예상 시세 ({benchmark.nearbyNewName} 기준)
              </label>
              <span className="font-mono text-sm font-bold text-emerald-700">
                {expectedFuturePrice.toFixed(1)} 억원
              </span>
            </div>
            <input
              type="range"
              min={Number((benchmark.marketPrice84 * 0.5).toFixed(1))}
              max={Number((benchmark.marketPrice84 * 1.8).toFixed(1))}
              step="0.5"
              value={expectedFuturePrice}
              onChange={(e) => setExpectedFuturePrice(parseFloat(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer h-2 bg-gray-200 rounded-lg"
            />
          </div>
        </div>

        {/* Right: Real-time Output & Margin Summary Card */}
        <div className="rounded-2xl border border-black/10 bg-[#f7f7f4] p-6 shadow-sm">
          <h3 className="font-bold text-sm text-[#171918] mb-4 flex items-center justify-between">
            <span>📊 실시간 투자 손익 분석</span>
            <span className="text-xs font-normal text-gray-500">전용 {targetType}㎡ 기준</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-black/5">
              <span className="text-gray-600">추정 권리가액 (감평가 × 비례율)</span>
              <span className="font-mono font-bold text-gray-800">{rightValue.toFixed(2)} 억원</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-black/5">
              <span className="text-gray-600">조합원 분양가</span>
              <span className="font-mono font-bold text-gray-800">{memberPrice.toFixed(2)} 억원</span>
            </div>

            <div className="flex justify-between py-2 border-b border-black/10 bg-white/70 px-2.5 rounded-lg">
              <span className="font-bold text-[#171918]">👉 예상 추가분담금</span>
              <span className={`font-mono font-extrabold text-sm ${contribution > 0 ? "text-red-600" : "text-emerald-700"}`}>
                {contribution > 0 ? `+ ${contribution.toFixed(2)} 억원` : `환급 ${Math.abs(contribution).toFixed(2)} 억원`}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-black/5">
              <span className="text-gray-600">총 취득원가 (매수가 + 분담금)</span>
              <span className="font-mono font-bold text-gray-900">{totalInvestment.toFixed(2)} 억원</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-black/5">
              <span className="text-gray-600">입주 시점 예상 시세</span>
              <span className="font-mono font-bold text-emerald-700">{expectedFuturePrice.toFixed(1)} 억원</span>
            </div>
          </div>

          {/* Final ROI Highlight Box */}
          <div className="mt-5 rounded-2xl bg-[#171918] p-4 text-white">
            <div className="flex items-center justify-between text-xs text-gray-300">
              <span>🎯 예상 안전마진 (순수익)</span>
              <span>예상 수익률 (ROI)</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <div className={`text-2xl font-extrabold font-mono ${expectedProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {expectedProfit >= 0 ? `+ ${expectedProfit.toFixed(1)} 억` : `${expectedProfit.toFixed(1)} 억`}
              </div>
              <div className={`text-xl font-bold font-mono ${expectedRoi >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {expectedRoi.toFixed(1)}%
              </div>
            </div>
            <p className="mt-2 text-[11px] text-gray-400 border-t border-gray-800 pt-2 leading-relaxed">
              {expectedProfit > 0
                ? `💡 주변 신축(${benchmark.nearbyNewName}) 대비 약 ${expectedProfit.toFixed(1)}억원의 안전마진이 확보되는 구조입니다.`
                : "⚠️ 현재 매물 가격 대비 안전마진이 타이트하므로 분담금과 비례율을 면밀히 검토해야 합니다."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
