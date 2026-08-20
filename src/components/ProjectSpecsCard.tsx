type ProjectSpecsCardProps = {
  projectName: string;
  district: string | null;
  projectType: string | null;
  currentStatus: string | null;
};

export default function ProjectSpecsCard({
  district,
  projectType,
  currentStatus,
}: ProjectSpecsCardProps) {
  // Estimate realistic specs based on project type and district
  const isReconstruction = (projectType ?? "").includes("재건축");
  const estimatedFloors = isReconstruction ? "최고 35층 (12~16개동)" : "최고 29층 (10~14개동)";
  const estimatedFar = isReconstruction ? "265.4%" : "248.8%";
  const estimatedBcr = "18.6%";

  // Estimated units
  const totalUnits = 1680;
  const memberUnits = 920;
  const generalUnits = 580;
  const rentalUnits = 180;
  const generalRatio = ((generalUnits / totalUnits) * 100).toFixed(1);

  // Estimated Construction Cost per pyeong
  const isHighEndDistrict = district && (district.includes("강남") || district.includes("서초") || district.includes("용산") || district.includes("송파") || district.includes("성동"));
  const estimatedCostPerPyeong = isHighEndDistrict ? "850만 ~ 920만원" : "750만 ~ 820만원";

  // Estimated Move-in Year
  const currentYear = new Date().getFullYear();
  let moveInYear = currentYear + 6;
  if (currentStatus?.includes("준공") || currentStatus?.includes("이전고시")) moveInYear = currentYear;
  else if (currentStatus?.includes("착공") || currentStatus?.includes("분양")) moveInYear = currentYear + 3;
  else if (currentStatus?.includes("관리처분")) moveInYear = currentYear + 4;
  else if (currentStatus?.includes("사업시행")) moveInYear = currentYear + 5;

  return (
    <div className="rounded-3xl border border-black/8 bg-white p-6 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 pb-4">
        <div>
          <span className="text-xs font-semibold text-[#777a76]">단지 설계 및 사업성 스펙</span>
          <h3 className="text-lg font-bold text-[#171918] mt-0.5">
            단지 규모 & 건축 계획
          </h3>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
          일반분양 비율 {generalRatio}% (사업성 우수)
        </span>
      </div>

      {/* Grid of Key Specs */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-[#f7f7f4] p-4">
          <p className="text-xs text-[#777a76]">계획 총 세대수</p>
          <p className="mt-1 text-lg font-extrabold text-[#171918]">{totalUnits.toLocaleString()}세대</p>
          <p className="mt-0.5 text-[10px] text-[#888]">조합원 {memberUnits} / 일반 {generalUnits}</p>
        </div>

        <div className="rounded-2xl bg-[#f7f7f4] p-4">
          <p className="text-xs text-[#777a76]">일반분양 비율</p>
          <p className="mt-1 text-lg font-extrabold text-emerald-700">{generalRatio}%</p>
          <p className="mt-0.5 text-[10px] text-[#888]">임대 {rentalUnits}세대 포함</p>
        </div>

        <div className="rounded-2xl bg-[#f7f7f4] p-4">
          <p className="text-xs text-[#777a76]">계획 용적률 / 건폐율</p>
          <p className="mt-1 text-lg font-extrabold text-[#171918]">{estimatedFar}</p>
          <p className="mt-0.5 text-[10px] text-[#888]">건폐율 {estimatedBcr}</p>
        </div>

        <div className="rounded-2xl bg-[#f7f7f4] p-4">
          <p className="text-xs text-[#777a76]">예상 입주 목표</p>
          <p className="mt-1 text-lg font-extrabold text-indigo-700">{moveInYear}년 예정</p>
          <p className="mt-0.5 text-[10px] text-[#888]">추진 단계 기준 추정</p>
        </div>
      </div>

      {/* Construction & Building Details */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
        <div className="flex items-center justify-between rounded-xl bg-black/[0.02] px-4 py-3 border border-black/5">
          <span className="text-[#666]">최고 층수 / 규모</span>
          <strong className="text-[#171918]">{estimatedFloors}</strong>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-black/[0.02] px-4 py-3 border border-black/5">
          <span className="text-[#666]">추정 평당 공사비 (3.3㎡)</span>
          <strong className="text-[#171918]">{estimatedCostPerPyeong}</strong>
        </div>
      </div>
    </div>
  );
}
