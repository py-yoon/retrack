"use client";

import { useState, useId } from "react";

type FeasibilityCalculatorProps = {
  projectName: string;
  district: string | null;
  projectType: string | null;
  currentStatus: string | null;
};

// District benchmark prices (조합원 분양가 및 신축 시세 기준값)
const DISTRICT_BENCHMARKS: Record<string, { p59: number; p84: number; p114: number; marketPrice84: number }> = {
  강남구: { p59: 12.5, p84: 17.5, p114: 24.0, marketPrice84: 28.0 },
  서초구: { p59: 12.0, p84: 17.0, p114: 23.5, marketPrice84: 27.0 },
  송파구: { p59: 9.5, p84: 13.5, p114: 18.5, marketPrice84: 21.0 },
  용산구: { p59: 10.5, p84: 15.0, p114: 21.0, marketPrice84: 24.0 },
  성동구: { p59: 8.5, p84: 12.0, p114: 16.5, marketPrice84: 18.0 },
  마포구: { p59: 8.0, p84: 11.5, p114: 16.0, marketPrice84: 17.5 },
  동작구: { p59: 7.5, p84: 10.5, p114: 14.5, marketPrice84: 16.0 },
  영등포구: { p59: 7.5, p84: 10.5, p114: 14.5, marketPrice84: 15.5 },
  양천구: { p59: 7.5, p84: 10.5, p114: 14.5, marketPrice84: 16.0 },
  광진구: { p59: 7.5, p84: 10.5, p114: 14.5, marketPrice84: 15.5 },
  강동구: { p59: 7.0, p84: 9.8, p114: 13.5, marketPrice84: 14.5 },
  동대문구: { p59: 6.5, p84: 9.0, p114: 12.5, marketPrice84: 13.0 },
  성북구: { p59: 6.0, p84: 8.5, p114: 11.8, marketPrice84: 12.0 },
  서대문구: { p59: 6.5, p84: 9.2, p114: 12.8, marketPrice84: 13.5 },
  은평구: { p59: 5.8, p84: 8.0, p114: 11.0, marketPrice84: 11.5 },
  관악구: { p59: 6.0, p84: 8.5, p114: 11.8, marketPrice84: 12.0 },
  구로구: { p59: 5.5, p84: 7.8, p114: 10.5, marketPrice84: 10.5 },
  금천구: { p59: 5.2, p84: 7.2, p114: 9.8, marketPrice84: 9.5 },
  중랑구: { p59: 5.5, p84: 7.5, p114: 10.2, marketPrice84: 10.0 },
  강북구: { p59: 5.5, p84: 7.5, p114: 10.2, marketPrice84: 10.0 },
  도봉구: { p59: 5.0, p84: 7.0, p114: 9.5, marketPrice84: 9.0 },
  노원구: { p59: 5.5, p84: 7.8, p114: 10.5, marketPrice84: 10.5 },
};

const DEFAULT_BENCHMARK = { p59: 7.0, p84: 9.8, p114: 13.5, marketPrice84: 14.5 };

export default function FeasibilityCalculator({
  projectName,
  district,
}: FeasibilityCalculatorProps) {
  const buyPriceId = useId();
  const benchmark = (district && DISTRICT_BENCHMARKS[district]) || DEFAULT_BENCHMARK;

  // State: Initial purchase price (억원)
  const [purchasePrice, setPurchasePrice] = useState<number>(() => {
    return district && (district.includes("강남") || district.includes("서초") || district.includes("용산")) ? 10.0 : 5.5;
  });

  // State: Target Unit Type (59 / 84 / 114)
  const [targetType, setTargetType] = useState<"59" | "84" | "114">("84");

  // State: Expected Proportional Ratio (비례율 %)
  const [ratio, setRatio] = useState<number>(100);

  // State: Expected Future Market Price (입주 시 예상 매매가 억원)
  const [expectedFuturePrice, setExpectedFuturePrice] = useState<number>(() => {
    return targetType === "59"
      ? Number((benchmark.marketPrice84 * 0.78).toFixed(1))
      : targetType === "84"
      ? benchmark.marketPrice84
      : Number((benchmark.marketPrice84 * 1.35).toFixed(1));
  });

  // Member price per type (억원)
  const memberPrice = targetType === "59" ? benchmark.p59 : targetType === "84" ? benchmark.p84 : benchmark.p114;

  // 1. Right Value (추정 권리가액) = 매수가격 * (비례율 / 100)
  const rightValue = purchasePrice * (ratio / 100);

  // 2. Additional Contribution (예상 추가분담금) = 조합원 분양가 - 권리가액
  const contribution = memberPrice - rightValue;

  // 3. Total Investment (총 실투자금액) = 초기 매수가격 + 추가분담금
  const totalInvestment = purchasePrice + contribution;

  // 4. Expected Profit (예상 시세차익) = 입주 시 예상시세 - 총 실투자금액
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
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
              투자 시뮬레이터
            </span>
            <h3 className="text-xl font-bold tracking-tight text-[#171918]">
              사업성 & 예상 분담금·수익률 계산기
            </h3>
          </div>
          <p className="mt-1 text-xs text-[#777a76]">
            {projectName} 구역의 매수가격과 평형을 입력하여 <strong>예상 분담금과 최종 시세차익(ROI)</strong>을 시뮬레이션합니다.
          </p>
        </div>
      </div>

      {/* Input Controls Grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Left Column: User Inputs */}
        <div className="space-y-5 rounded-2xl bg-[#f7f7f4] p-5">
          {/* 1. Target Unit Type Selector */}
          <div>
            <span className="block text-xs font-bold text-[#171918] mb-2">
              1. 분양 희망 평형 선택
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange("59")}
                className={`rounded-xl py-2.5 text-xs font-bold transition ${
                  targetType === "59"
                    ? "bg-[#171918] text-white shadow-sm"
                    : "bg-white text-[#555] hover:bg-black/5"
                }`}
              >
                59㎡ (25평형)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange("84")}
                className={`rounded-xl py-2.5 text-xs font-bold transition ${
                  targetType === "84"
                    ? "bg-[#171918] text-white shadow-sm"
                    : "bg-white text-[#555] hover:bg-black/5"
                }`}
              >
                84㎡ (34평형 ⭐)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange("114")}
                className={`rounded-xl py-2.5 text-xs font-bold transition ${
                  targetType === "114"
                    ? "bg-[#171918] text-white shadow-sm"
                    : "bg-white text-[#555] hover:bg-black/5"
                }`}
              >
                114㎡ (45평형)
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-[#777a76]">
              • {district ?? "해당"} 구역 조합원 예상 분양가: <strong>약 {memberPrice}억원</strong>
            </p>
          </div>

          {/* 2. Purchase Price Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor={buyPriceId} className="text-xs font-bold text-[#171918]">
                2. 내 초기 매수 가격 (감정평가액)
              </label>
              <span className="font-mono text-sm font-bold text-[#171918]">
                {purchasePrice.toFixed(1)}억원 ({Math.round(purchasePrice * 10000).toLocaleString()}만원)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                id={buyPriceId}
                type="number"
                step="0.5"
                min="1"
                max="50"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(Math.max(0.5, Number(e.target.value) || 0))}
                className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2 text-sm font-semibold outline-none focus:border-black/30"
              />
              <span className="shrink-0 text-xs font-medium text-[#777a76]">억원</span>
            </div>
            <div className="mt-2 flex gap-1.5">
              {[3.0, 5.0, 7.0, 10.0, 15.0].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPurchasePrice(p)}
                  className="rounded-lg bg-white px-2 py-1 text-[11px] font-medium text-[#555] hover:bg-black/5 border border-black/5"
                >
                  {p}억
                </button>
              ))}
            </div>
          </div>

          {/* 3. Expected Proportional Ratio (비례율) Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-[#171918]">
                3. 예상 비례율 (%)
              </span>
              <span className={`font-mono text-sm font-bold ${ratio >= 100 ? "text-emerald-700" : "text-rose-600"}`}>
                {ratio}% {ratio > 100 ? "(사업성 우수)" : ratio === 100 ? "(표준)" : "(수익 감소 주의)"}
              </span>
            </div>
            <input
              type="range"
              min="80"
              max="130"
              step="1"
              value={ratio}
              onChange={(e) => setRatio(Number(e.target.value))}
              className="w-full accent-[#171918]"
              aria-label="예상 비례율 (%)"
            />
            <div className="flex justify-between text-[10px] text-[#999]">
              <span>80% (사업성 악화)</span>
              <span>100% (기본)</span>
              <span>130% (대박 사업성)</span>
            </div>
          </div>

          {/* 4. Expected Market Price at Move-in */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-[#171918]">
                4. 입주 시점 예상 시세 (인근 신축 기준)
              </span>
              <span className="font-mono text-sm font-bold text-[#171918]">
                {expectedFuturePrice.toFixed(1)}억원
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="1"
                max="80"
                value={expectedFuturePrice}
                onChange={(e) => setExpectedFuturePrice(Math.max(1, Number(e.target.value) || 0))}
                className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2 text-sm font-semibold outline-none focus:border-black/30"
                aria-label="입주 시점 예상 시세"
              />
              <span className="shrink-0 text-xs font-medium text-[#777a76]">억원</span>
            </div>
          </div>
        </div>

        {/* Right Column: Simulation Result Dashboard */}
        <div className="flex flex-col justify-between rounded-2xl border border-black/8 bg-[#fbfbfa] p-5">
          <div>
            <span className="text-xs font-bold tracking-tight text-[#777a76]">시뮬레이션 분석 결과</span>

            {/* Key Metric 1: Additional Contribution (추가분담금) */}
            <div className="mt-3 rounded-2xl bg-white p-4 border border-black/5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#555]">
                  {contribution >= 0 ? "예상 추가분담금 (납부액)" : "예상 환급금 (수령액)"}
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                    contribution <= 0
                      ? "bg-emerald-50 text-emerald-700"
                      : contribution <= 3.0
                      ? "bg-amber-50 text-amber-800"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {contribution <= 0 ? "환급 대상" : "분담금 발생"}
                </span>
              </div>
              <p
                className={`mt-2 text-3xl font-extrabold tracking-tight ${
                  contribution <= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {contribution >= 0 ? `+${contribution.toFixed(1)}억원` : `${contribution.toFixed(1)}억원`}
              </p>
              <p className="mt-1 text-[11px] text-[#777a76]">
                조합원 분양가({memberPrice}억) - 추정 권리가액({rightValue.toFixed(1)}억)
              </p>
            </div>

            {/* Key Metric 2: Total Investment & Profit */}
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <div className="rounded-xl bg-white p-3.5 border border-black/5">
                <p className="text-[11px] text-[#777a76]">총 실투자금액</p>
                <p className="mt-1 text-xl font-bold text-[#171918]">{totalInvestment.toFixed(1)}억원</p>
                <p className="mt-0.5 text-[10px] text-[#999]">초기매수가 + 분담금</p>
              </div>
              <div className="rounded-xl bg-white p-3.5 border border-black/5">
                <p className="text-[11px] text-[#777a76]">예상 시세차익 (프리미엄)</p>
                <p
                  className={`mt-1 text-xl font-bold ${
                    expectedProfit >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {expectedProfit >= 0 ? `+${expectedProfit.toFixed(1)}억원` : `${expectedProfit.toFixed(1)}억원`}
                </p>
                <p className="mt-0.5 text-[10px] text-[#999]">예상시세 - 총투자금</p>
              </div>
            </div>

            {/* Key Metric 3: ROI Banner */}
            <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200/80 p-3.5 text-emerald-950">
              <div>
                <span className="text-[11px] font-bold text-emerald-800">최종 투자 수익률 (ROI)</span>
                <p className="text-2xl font-black tracking-tight text-emerald-700">
                  {expectedRoi > 0 ? `+${expectedRoi.toFixed(1)}%` : `${expectedRoi.toFixed(1)}%`}
                </p>
              </div>
              <div className="text-right">
                <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">
                  {expectedRoi >= 50 ? "🚀 초특급 사업성" : expectedRoi >= 25 ? "✨ 우수 투자처" : "보통"}
                </span>
              </div>
            </div>
          </div>

          {/* AI Simulation Commentary */}
          <div className="mt-4 rounded-xl bg-white p-3.5 border border-black/5 text-xs leading-relaxed text-[#555]">
            <p className="font-bold text-[#171918] flex items-center gap-1.5 mb-1">
              <span>💡 사업성 핵심 분석 총평</span>
            </p>
            <p>
              • 본 구역 {targetType}㎡ 신청 시, 초기 매수가 {purchasePrice}억원 기준 예상 분담금은{" "}
              <strong>약 {contribution.toFixed(1)}억원</strong>입니다.<br />
              • 입주 시점 예상 시세({expectedFuturePrice}억원) 도달 시, 총 투자금 대비{" "}
              <strong className="text-emerald-700">약 {expectedProfit.toFixed(1)}억원 (+{expectedRoi.toFixed(1)}%)의 시세차익</strong>이 기대됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
