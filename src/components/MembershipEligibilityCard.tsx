"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { diagnoseMembershipEligibility } from "@/lib/utils/eligibility";

type MembershipEligibilityCardProps = {
  projectName: string;
  district: string | null;
  projectType: string | null;
  currentStatus: string | null;
};

export default function MembershipEligibilityCard({
  projectName,
  district,
  projectType,
  currentStatus,
}: MembershipEligibilityCardProps) {
  const { user, openLoginModal } = useAuth();
  const diagnosis = diagnoseMembershipEligibility(district, projectType, currentStatus);

  // Interactive Question State for Logged-in Users
  const [qSeller10_5, setQSeller10_5] = useState<"yes" | "no" | "unknown">("unknown");
  const [qMultiProperty, setQMultiProperty] = useState<"no" | "yes" | "unknown">("no");
  const [qNewBuildSplit, setQNewBuildSplit] = useState<"no" | "yes" | "unknown">("no");

  return (
    <div className="rounded-3xl border border-black/8 bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <h2 className="text-xl font-bold tracking-tight text-[#171918]">
              조합원 자격 판정기 & 현금청산(물딱지) 방지 레이더
            </h2>
            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-300">
              도정법 제39조 법률 진단
            </span>
          </div>
          <p className="mt-1 text-xs text-[#777a76]">
            {projectName} 매수 시 <strong>지금 사도 새 아파트 입주권이 나오는지, 현금청산(물딱지) 대상인지</strong> 법률 규제를 1초 만에 판정합니다.
          </p>
        </div>

        {/* Status Light Badge */}
        <div>
          <span className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border ${diagnosis.badgeBg} ${diagnosis.badgeColor} shadow-2xs`}>
            {diagnosis.statusBadge}
          </span>
        </div>
      </div>

      {/* Core Legal Summary */}
      <div className="mt-5 p-4 rounded-2xl bg-[#f7f7f4] border border-black/5">
        <div className="flex items-center justify-between text-xs font-bold text-[#171918] mb-1.5">
          <span>⚖️ {diagnosis.statusTitle}</span>
          <span className="text-gray-400 font-normal">{diagnosis.legalBasis}</span>
        </div>
        <p className="text-xs text-gray-700 leading-relaxed font-medium">
          {diagnosis.summary}
        </p>
      </div>

      {/* Gated Area: Login Required */}
      {!user ? (
        <div className="mt-6 relative rounded-2xl border border-dashed border-emerald-300 bg-gradient-to-b from-emerald-50/50 to-emerald-50/90 p-6 text-center overflow-hidden">
          <div className="max-w-md mx-auto">
            <span className="inline-block text-2xl mb-2">🔒</span>
            <h3 className="text-base font-extrabold text-[#171918]">
              내 매물 조합원 입주권 승계 여부 정밀 진단
            </h3>
            <p className="mt-1.5 text-xs text-gray-600 leading-relaxed">
              매도인의 10년보유/5년거주 여부, 다물권자 위험, 계약 전 필수 확인 서류 체크리스트를 <strong>소셜 로그인 후 무료로 즉시 확인</strong>하세요.
            </p>

            <button
              type="button"
              onClick={openLoginModal}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#171918] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-black/80 shadow-sm cursor-pointer"
            >
              <span>⚡</span>
              <span>1초 소셜 로그인으로 무료 판정하기 ➔</span>
            </button>
          </div>
        </div>
      ) : (
        /* Logged-in User: Full Interactive Simulator & Verification Checklist */
        <div className="mt-6 space-y-6 animate-fade-in">
          {/* Interactive Checkbox Section */}
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-2xs">
            <h3 className="font-bold text-xs text-[#171918] mb-3 flex items-center gap-1.5">
              <span>📋</span>
              <span>매수 희망 매물 조건 자가 진단</span>
            </h3>

            <div className="space-y-4 text-xs">
              {/* Question 1: 10년 보유 5년 거주 (투기과열지구) */}
              {diagnosis.isSpeculativeDistrict && (
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="font-semibold text-gray-800 mb-2">
                    1. 매도인이 <strong>1세대 1주택자로서 10년 이상 보유하고 5년 이상 거주</strong>했나요?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setQSeller10_5("yes")}
                      className={`px-3 py-1.5 rounded-lg border font-bold transition cursor-pointer ${
                        qSeller10_5 === "yes" ? "bg-emerald-600 text-white border-emerald-700" : "bg-white text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      ✓ 예 (10년보유·5년거주 1주택)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQSeller10_5("no")}
                      className={`px-3 py-1.5 rounded-lg border font-bold transition cursor-pointer ${
                        qSeller10_5 === "no" ? "bg-rose-600 text-white border-rose-700" : "bg-white text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      ✕ 아니오 (다주택자 / 기간미달)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQSeller10_5("unknown")}
                      className={`px-3 py-1.5 rounded-lg border font-bold transition cursor-pointer ${
                        qSeller10_5 === "unknown" ? "bg-gray-800 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      확인 필요
                    </button>
                  </div>
                </div>
              )}

              {/* Question 2: 다물권자 매물 여부 */}
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                <p className="font-semibold text-gray-800 mb-2">
                  2. 동일 구역 내에 <strong>매도인이 다른 주택/토지를 추가로 보유</strong>하고 있나요? (다물권자 리스크)
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setQMultiProperty("no")}
                    className={`px-3 py-1.5 rounded-lg border font-bold transition cursor-pointer ${
                      qMultiProperty === "no" ? "bg-emerald-600 text-white border-emerald-700" : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    ✓ 아니오 (이 구역에 1채만 보유 - 안전)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQMultiProperty("yes")}
                    className={`px-3 py-1.5 rounded-lg border font-bold transition cursor-pointer ${
                      qMultiProperty === "yes" ? "bg-rose-600 text-white border-rose-700" : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    ⚠️ 예 (다물권자 매물 - 입주권 분할 불가 위험)
                  </button>
                </div>
              </div>

              {/* Question 3: 신축 쪼개기 매물 여부 */}
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                <p className="font-semibold text-gray-800 mb-2">
                  3. 권리산정기준일 이후에 준공되거나 지분이 분할된 <strong>신축 쪼개기 매물</strong>인가요?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setQNewBuildSplit("no")}
                    className={`px-3 py-1.5 rounded-lg border font-bold transition cursor-pointer ${
                      qNewBuildSplit === "no" ? "bg-emerald-600 text-white border-emerald-700" : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    ✓ 아니오 (기존 노후 건물 - 안전)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQNewBuildSplit("yes")}
                    className={`px-3 py-1.5 rounded-lg border font-bold transition cursor-pointer ${
                      qNewBuildSplit === "yes" ? "bg-rose-600 text-white border-rose-700" : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    ⚠️ 권리산정일 이후 신축 (현금청산 위험)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Diagnosis Output Verdict */}
          <div className="p-4 rounded-2xl bg-[#171918] text-white">
            <div className="flex items-center justify-between text-xs text-gray-300 mb-1">
              <span>🎯 최종 조합원 자격 판정 결과</span>
              <span className="text-emerald-400 font-bold">RE:TRACK AI 진단</span>
            </div>
            <div className="text-base font-extrabold text-white mt-1">
              {qNewBuildSplit === "yes"
                ? "🔴 [현금청산 위험] 권리산정일 이후 쪼개기 매물은 입주권이 나오지 않습니다."
                : qMultiProperty === "yes"
                ? "🟡 [주의 요망] 다물권자 매물은 조합 전체에서 1개 입주권만 부여되므로 단독 승계 여부를 조합에 확인해야 합니다."
                : diagnosis.statusLevel === "HIGH_RISK" && qSeller10_5 !== "yes"
                ? "🔴 [승계 불가] 10년보유 5년거주 1주택 매물이 아닌 경우 현금청산 대상입니다."
                : "🟢 [매수 안전] 현재 조건상 합법적으로 조합원 입주권 승계가 가능합니다!"}
            </div>
          </div>

          {/* Required Verification Documents Checklist */}
          <div className="grid gap-4 sm:grid-cols-2 text-xs">
            <div className="p-4 rounded-2xl bg-[#f7f7f4] border border-black/5">
              <h4 className="font-bold text-[#171918] mb-2 flex items-center gap-1.5">
                <span>📄</span>
                <span>계약 전 필수 확인 서류</span>
              </h4>
              <ul className="space-y-1.5 text-gray-600 list-disc list-inside">
                {diagnosis.requiredDocs.map((doc) => (
                  <li key={doc}>{doc}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-[#f7f7f4] border border-black/5">
              <h4 className="font-bold text-[#171918] mb-2 flex items-center gap-1.5">
                <span>💡</span>
                <span>합법적 예외 승계 요건</span>
              </h4>
              <ul className="space-y-1.5 text-gray-600 list-disc list-inside">
                {diagnosis.exceptions.map((ex) => (
                  <li key={ex}>{ex}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
