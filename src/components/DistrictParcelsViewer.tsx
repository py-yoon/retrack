"use client";

import { useState, useRef } from "react";
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
  const allParcels = getDistrictParcels(projectId) || getDistrictParcels(projectName);
  const [filterText, setFilterText] = useState("");
  const [selectedLot, setSelectedLot] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(25);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter parcels
  const filteredParcels = allParcels.filter((p) =>
    p.lotNumber.toLowerCase().includes(filterText.trim().toLowerCase()) ||
    p.mainUse.toLowerCase().includes(filterText.trim().toLowerCase()) ||
    p.landCategory.toLowerCase().includes(filterText.trim().toLowerCase())
  );

  const visibleParcels = filteredParcels.slice(0, displayCount);
  const hasMore = visibleParcels.length < filteredParcels.length;

  const currentLedger = selectedLot ? getBuildingLedgerInfo(selectedLot) : null;

  return (
    <div className="rounded-3xl border border-black/8 bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/5 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[#171918]">
              구역 내 편입 지번 조서 & 개별 건축물대장
            </h3>
            <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
              총 {allParcels.length}개 필지 연동
            </span>
          </div>
          <p className="mt-1 text-xs text-[#777a76]">
            {projectName}에 편입된 <strong>전체 토지/지번 조서</strong>입니다. 아래 목록을 <strong>마우스 휠이나 드래그로 스크롤</strong>하여 탐색하시고, 지번을 누르면 <strong>1초 건축물대장</strong>이 열립니다.
          </p>
        </div>

        {/* Search input for parcels */}
        <div className="w-full sm:w-72">
          <div className="relative">
            <input
              type="text"
              placeholder="지번 번지 검색 (예: 686, 16-1, 보광동)"
              value={filterText}
              onChange={(e) => {
                setFilterText(e.target.value);
                setDisplayCount(25);
              }}
              className="w-full rounded-xl border border-black/10 bg-[#f7f7f4] pl-3.5 pr-8 py-2.5 text-xs text-[#171918] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
            />
            {filterText && (
              <button
                type="button"
                onClick={() => setFilterText("")}
                className="absolute right-2.5 top-2.5 text-xs text-gray-400 hover:text-black cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Selected Parcel Building Ledger Drawer */}
      {selectedLot && currentLedger && (
        <div className="mt-6 animate-fade-in border-b border-black/5 pb-6">
          <div className="flex items-center justify-between mb-3 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">
            <div className="flex items-center gap-2">
              <span className="text-sm">🔍</span>
              <span className="text-xs font-bold text-emerald-900">
                선택된 필지: <strong>{selectedLot}</strong> 국토교통부 표준 건축물대장
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedLot(null)}
              className="text-xs font-bold text-emerald-800 hover:text-black cursor-pointer bg-white px-2 py-0.5 rounded border border-emerald-300"
            >
              대장 닫기 ✕
            </button>
          </div>
          <BuildingLedgerCard ledger={currentLedger} />
        </div>
      )}

      {/* Status Bar */}
      <div className="mt-4 flex items-center justify-between text-[11px] text-gray-500 px-1">
        <span>
          검색된 지번: <strong className="text-[#171918]">{filteredParcels.length}</strong>개 중{" "}
          <strong className="text-emerald-700">{visibleParcels.length}</strong>개 표시 (마우스 휠/드래그 스크롤)
        </span>
        <span className="text-gray-400">💡 지번 클릭 시 건축물대장 즉시 확인</span>
      </div>

      {/* Scrollable & Draggable Parcels Table Container */}
      <div
        ref={scrollContainerRef}
        className="mt-2 max-h-[460px] overflow-y-auto overflow-x-auto rounded-2xl border border-black/8 bg-white shadow-inner custom-scrollbar"
      >
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-[#f7f7f4] shadow-xs">
            <tr className="border-b border-black/10 text-gray-600 font-bold">
              <th className="py-3 px-3.5">편입 지번</th>
              <th className="py-3 px-3">지목</th>
              <th className="py-3 px-3">토지 면적</th>
              <th className="py-3 px-3">현황 용도</th>
              <th className="py-3 px-3">준공연도 (노후도)</th>
              <th className="py-3 px-3.5 text-right">건축물대장</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {visibleParcels.length > 0 ? (
              visibleParcels.map((parcel, idx) => {
                const isSelected = selectedLot === parcel.lotNumber;
                const pyeong = (parcel.landArea * 0.3025).toFixed(1);

                return (
                  <tr
                    key={`${parcel.lotNumber}-${idx}`}
                    onClick={() => setSelectedLot(isSelected ? null : parcel.lotNumber)}
                    className={`transition cursor-pointer ${
                      isSelected
                        ? "bg-emerald-50/90 font-semibold text-emerald-950"
                        : "hover:bg-emerald-50/40 text-[#171918]"
                    }`}
                  >
                    <td className="py-3 px-3.5 font-bold flex items-center gap-1.5">
                      <span className="text-xs">📍</span>
                      <span className={isSelected ? "text-emerald-800" : ""}>{parcel.lotNumber}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                        {parcel.landCategory}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium">
                      {parcel.landArea.toLocaleString()}㎡ <span className="text-gray-400 font-normal">({pyeong}평)</span>
                    </td>
                    <td className="py-3 px-3 text-gray-700">{parcel.mainUse}</td>
                    <td className="py-3 px-3">
                      {parcel.buildYear ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="font-mono text-gray-600">{parcel.buildYear}년</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            {new Date().getFullYear() - parcel.buildYear}년차
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-400 text-[10px]">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <button
                        type="button"
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition shadow-2xs cursor-pointer ${
                          isSelected
                            ? "bg-emerald-700 text-white"
                            : "bg-white border border-black/10 text-gray-700 hover:bg-emerald-50 hover:text-emerald-800"
                        }`}
                      >
                        {isSelected ? "대장 열림 ✓" : "대장 보기 ➔"}
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400">
                  입력하신 지번 번지와 일치하는 필지가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Load More Controls */}
      {hasMore && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-4">
          <span className="text-xs text-gray-500">
            남은 지번 <strong>{filteredParcels.length - visibleParcels.length}</strong>개가 더 있습니다.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDisplayCount((prev) => prev + 25)}
              className="rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-bold text-[#171918] hover:bg-emerald-50 hover:text-emerald-800 transition shadow-2xs cursor-pointer"
            >
              + 지번 25개 더 불러오기
            </button>
            <button
              type="button"
              onClick={() => setDisplayCount(filteredParcels.length)}
              className="rounded-xl bg-[#171918] px-4 py-2 text-xs font-bold text-white hover:bg-black/80 transition shadow-2xs cursor-pointer"
            >
              전체 {filteredParcels.length}개 한번에 보기 ➔
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
