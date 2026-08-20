import { getProjectSpecs } from "@/lib/data/project-specs";

type ProjectSpecsCardProps = {
  projectName: string;
  district: string | null;
  projectType: string | null;
  currentStatus: string | null;
};

export default function ProjectSpecsCard({
  projectName,
  district,
  projectType,
  currentStatus,
}: ProjectSpecsCardProps) {
  const spec = getProjectSpecs(projectName, district, projectType);

  // Estimated Construction Cost per pyeong
  const isHighEndDistrict =
    district &&
    (district.includes("강남") ||
      district.includes("서초") ||
      district.includes("용산") ||
      district.includes("송파") ||
      district.includes("성동"));
  const estimatedCostPerPyeong = isHighEndDistrict ? "850만 ~ 920만원" : "750만 ~ 820만원";

  // Estimated Move-in Year
  const currentYear = new Date().getFullYear();
  let moveInYear = currentYear + 6;
  if (currentStatus?.includes("준공") || currentStatus?.includes("이전고시")) moveInYear = currentYear;
  else if (currentStatus?.includes("착공") || currentStatus?.includes("분양")) moveInYear = currentYear + 3;
  else if (currentStatus?.includes("관리처분")) moveInYear = currentYear + 4;
  else if (currentStatus?.includes("사업시행")) moveInYear = currentYear + 5;

  const hasVerifiedUnits = spec.totalUnits !== null;

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
        {hasVerifiedUnits && spec.generalRatio ? (
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            일반분양 비율 {spec.generalRatio} (사업성 지표)
          </span>
        ) : (
          <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-[#666]">
            사업시행계획 수립 단계
          </span>
        )}
      </div>

      {/* Grid of Key Specs */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Total Units */}
        <div className="rounded-2xl bg-[#f7f7f4] p-4">
          <p className="text-xs text-[#777a76]">계획 총 세대수</p>
          <p className="mt-1 text-lg font-extrabold text-[#171918]">
            {hasVerifiedUnits ? `${spec.totalUnits?.toLocaleString()}세대` : "인가 수립 중"}
          </p>
          <p className="mt-0.5 text-[10px] text-[#888]">
            {hasVerifiedUnits
              ? `조합원 ${spec.memberUnits} / 일반 ${spec.generalUnits}`
              : "사업시행인가 시 확정"}
          </p>
        </div>

        {/* 2. General Units Ratio */}
        <div className="rounded-2xl bg-[#f7f7f4] p-4">
          <p className="text-xs text-[#777a76]">일반분양 비율</p>
          <p className="mt-1 text-lg font-extrabold text-emerald-700">
            {hasVerifiedUnits && spec.generalRatio ? spec.generalRatio : "산정 예정"}
          </p>
          <p className="mt-0.5 text-[10px] text-[#888]">
            {hasVerifiedUnits && spec.rentalUnits
              ? `임대 ${spec.rentalUnits}세대 포함`
              : "조합원 분양 후 산정"}
          </p>
        </div>

        {/* 3. FAR & BCR */}
        <div className="rounded-2xl bg-[#f7f7f4] p-4">
          <p className="text-xs text-[#777a76]">계획 용적률</p>
          <p className="mt-1 text-lg font-extrabold text-[#171918]">
            {spec.far ?? "조례 상한 적용"}
          </p>
          <p className="mt-0.5 text-[10px] text-[#888]">
            {spec.bcr ? `건폐율 ${spec.bcr}` : "건폐율 20% 이하"}
          </p>
        </div>

        {/* 4. Estimated Move-in Year */}
        <div className="rounded-2xl bg-[#f7f7f4] p-4">
          <p className="text-xs text-[#777a76]">예상 입주 목표</p>
          <p className="mt-1 text-lg font-extrabold text-indigo-700">
            {moveInYear}년 예정
          </p>
          <p className="mt-0.5 text-[10px] text-[#888]">
            추진 단계 기준 추정
          </p>
        </div>
      </div>

      {/* Construction & Building Details */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs">
        <div className="flex items-center justify-between rounded-xl bg-black/[0.02] px-4 py-3 border border-black/5">
          <span className="text-[#666]">최고 층수 / 규모</span>
          <strong className="text-[#171918]">{spec.floors ?? "최고 29~35층 내외"}</strong>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-black/[0.02] px-4 py-3 border border-black/5">
          <span className="text-[#666]">시공사 (브랜드)</span>
          <strong className="text-[#171918]">{spec.builder ?? "선정 준비 중"}</strong>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-black/[0.02] px-4 py-3 border border-black/5">
          <span className="text-[#666]">추정 평당 공사비 (3.3㎡)</span>
          <strong className="text-[#171918]">{estimatedCostPerPyeong}</strong>
        </div>
      </div>
    </div>
  );
}
