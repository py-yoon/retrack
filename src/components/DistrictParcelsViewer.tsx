"use client";

import { useState } from "react";
import { getDistrictParcels, DistrictParcelItem } from "@/lib/data/district-parcels";
import { getBuildingLedgerInfo } from "@/lib/data/building-ledger";
import BuildingLedgerCard from "./BuildingLedgerCard";

type DistrictParcelsViewerProps = {
  projectId: string;
  projectName: string;
  district: string | null;
};

export default function DistrictParcelsViewer({
  projectId,
  projectName,
  district,
}: DistrictParcelsViewerProps) {
  const parcels = getDistrictParcels(projectId) || getDistrictParcels(projectName);
  const [filterText, setFilterText] = useState("");
  const [selectedLot, setSelectedLot] = useState<string | null>(null);

  const filteredParcels = parcels.filter((p) =>
    p.lotNumber.toLowerCase().includes(filterText.trim().toLowerCase()) ||
    p.mainUse.toLowerCase().includes(filterText.trim().toLowerCase())
  );

  const currentLedger = selectedLot ? getBuildingLedgerInfo(selectedLot) : null;

  return (
    <div className="rounded-3xl border border-black/8 bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[#171918]">
              구역 내 편입 지번 조서 & 개별 건축물대장
            </h3>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
              공식 고시 조서 연동
            </span>
          </div>
          <p className="mt-1 text-xs text-[#777a76]">
            {projectName}에 포함된 <strong>주요 편입 지번 목록</strong>입니다. 지번을 클릭하시면 해당 필지의 <strong>공식 건축물대장 및 노후도</strong>를 1초 만에 확인하실 수 있습니다.
          </p>
        </div>

        {/* Search input for parcels */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="지번 번지 검색 (예: 16-1, 686)"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-[#f7f7f4] px-3.5 py-2 text-xs text-[#171918] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>
      </div>

      {/* Selected Parcel Building Ledger Drawer (if selected) */}
      {selectedLot && currentLedger && (
        <div className="mt-6 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-800">
              🔍 선택된 필지: {selectedLot} 건축물대장
            </span>
            <button
              type="button"
              onClick={() => setSelectedLot(null)}
              className="text-xs font-bold text-gray-500 hover:text-black cursor-pointer"
            >
              닫기 ✕
            </button>
          </div>
          <BuildingLedgerCard ledger={currentLedger} />
        </div>
      )}

      {/* Parcels Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-black/10 bg-gray-50/80 text-gray-500 font-bold">
              <th className="py-2.5 px-3">편입 지번</th>
              <th className="py-2.5 px-3">지목</th>
              <th className="py-2.5 px-3">토지 면적</th>
              <th className="py-2.5 px-3">현황 용도</th>
              <th className="py-2.5 px-3">준공연도 (노후도)</th>
              <th className="py-2.5 px-3 text-right">건축물대장</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {filteredParcels.map((parcel) => {
              const isSelected = selectedLot === parcel.lotNumber;
              const pyeong = (parcel.landArea * 0.3025).toFixed(1);

              return (
                <tr
                  key={parcel.lotNumber}
                  onClick={() => setSelectedLot(isSelected ? null : parcel.lotNumber)}
                  className={`transition cursor-pointer ${
                    isSelected ? "bg-emerald-50/80 font-semibold text-emerald-950" : "hover:bg-gray-50/70 text-[#171918]"
                  }`}
                >
                  <td className="py-3 px-3 font-bold flex items-center gap-1.5">
                    <span>📍</span>
                    <span>{parcel.lotNumber}</span>
                  </td>
                  <td className="py-3 px-3 text-gray-500">{parcel.landCategory}</td>
                  <td className="py-3 px-3 font-medium">
                    {parcel.landArea.toLocaleString()}㎡ <span className="text-gray-400 font-normal">({pyeong}평)</span>
                  </td>
                  <td className="py-3 px-3">{parcel.mainUse}</td>
                  <td className="py-3 px-3">
                    {parcel.buildYear ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="font-mono text-gray-600">{parcel.buildYear}년</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-200">
                          {new Date().getFullYear() - parcel.buildYear}년차
                        </span>
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition shadow-2xs cursor-pointer ${
                        isSelected
                          ? "bg-emerald-700 text-white"
                          : "bg-white border border-black/10 text-gray-700 hover:bg-emerald-50 hover:text-emerald-800"
                      }`}
                    >
                      {isSelected ? "선택됨 ✓" : "대장 보기 ➔"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
