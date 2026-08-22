"use client";

import { useState } from "react";
import type { BuildingLedgerInfo } from "@/lib/data/building-ledger";

type BuildingLedgerCardProps = {
  ledger: BuildingLedgerInfo;
  className?: string;
};

export default function BuildingLedgerCard({ ledger, className = "" }: BuildingLedgerCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  // m2 to pyeong
  const platPyeong = (ledger.platArea * 0.3025).toFixed(1);
  const totPyeong = (ledger.totArea * 0.3025).toFixed(1);

  return (
    <div className={`rounded-3xl border border-black/10 bg-white p-6 shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏛️</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-[#171918]">
                공식 건축물대장(표제부) & 노후도 진단
              </h3>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                국토교통부 연동
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{ledger.address}</p>
          </div>
        </div>

        {/* Aging Status Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-black px-3 py-1 rounded-xl bg-rose-100 border border-rose-300 text-rose-800 shadow-2xs">
            🚨 준공 {ledger.ageYears}년차 (노후도 충족)
          </span>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-xs font-bold text-gray-500 hover:text-[#171918] cursor-pointer"
          >
            {isOpen ? "접기 ▲" : "펼치기 ▼"}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="mt-5 space-y-4 animate-fade-in">
          {/* Main Grid Specs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
              <p className="text-gray-400 font-medium">주용도</p>
              <p className="font-bold text-[#171918] mt-1 truncate">{ledger.mainPurps}</p>
            </div>

            <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
              <p className="text-gray-400 font-medium">사용승인일 (준공)</p>
              <p className="font-bold text-blue-600 mt-1">{ledger.useAprDay}</p>
            </div>

            <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
              <p className="text-gray-400 font-medium">규모 (층수)</p>
              <p className="font-bold text-[#171918] mt-1">
                지상 {ledger.grndFlrCnt}층 / 지하 {ledger.ugrndFlrCnt}층
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
              <p className="text-gray-400 font-medium">위반건축물 여부</p>
              <p className={`font-bold mt-1 ${ledger.isViolation ? "text-rose-600" : "text-emerald-700"}`}>
                {ledger.isViolation ? "⚠️ 위반 등재" : "✓ 정상 (위반 없음)"}
              </p>
            </div>
          </div>

          {/* Area & Structural Details Table */}
          <div className="rounded-2xl border border-black/5 bg-[#f7f7f4] p-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-gray-500 block">대지면적</span>
                <span className="font-bold text-[#171918]">
                  {ledger.platArea.toLocaleString()}㎡ <span className="text-gray-400 font-normal">({platPyeong}평)</span>
                </span>
              </div>

              <div>
                <span className="text-gray-500 block">연면적</span>
                <span className="font-bold text-[#171918]">
                  {ledger.totArea.toLocaleString()}㎡ <span className="text-gray-400 font-normal">({totPyeong}평)</span>
                </span>
              </div>

              <div>
                <span className="text-gray-500 block">건폐율 / 용적률</span>
                <span className="font-bold text-[#171918]">
                  {ledger.bcRat}% / {ledger.vlRat}%
                </span>
              </div>

              <div>
                <span className="text-gray-500 block">주요 구조</span>
                <span className="font-bold text-[#171918] truncate block">{ledger.strctCdNm}</span>
              </div>
            </div>
          </div>

          {/* Renewal Legal Evaluation */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2">
            <span className="text-sm shrink-0">💡</span>
            <p className="leading-relaxed">
              <strong>재개발 노후도 평가</strong>: {ledger.renewalEvaluation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
