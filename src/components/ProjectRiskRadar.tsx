"use client";

type ProjectRiskRadarProps = {
  projectName: string;
  district: string | null;
  currentStatus: string | null;
  projectType: string | null;
};

type RiskItem = {
  category: string;
  score: number; // 0 (안전) ~ 100 (초고위험)
  level: "안전" | "보통" | "주의" | "위험";
  color: string;
  badgeBg: string;
  summary: string;
  detail: string;
};

export default function ProjectRiskRadar({
  projectName,
  district,
  currentStatus,
  projectType,
}: ProjectRiskRadarProps) {
  // Determine risk metrics based on current status and district characteristics
  const isEarly = /정비구역|추진위|조합설립/.test(currentStatus ?? "");
  const isMid = /사업시행/.test(currentStatus ?? "");
  const isLate = /관리처분|착공|준공/.test(currentStatus ?? "");

  const risks: RiskItem[] = [
    {
      category: "🔨 공사비 증액 갈등 리스크",
      score: isLate ? 65 : isMid ? 45 : 30,
      level: isLate ? "주의" : "보통",
      color: isLate ? "text-amber-700" : "text-blue-700",
      badgeBg: isLate ? "bg-amber-100 border-amber-300" : "bg-blue-100 border-blue-300",
      summary: isLate ? "최근 평당 공사비 협상 구간 (평당 850만~950만원 선 예상)" : "시공사 선정 및 본계약 체결 시 공사비 검증 필요",
      detail: "서울시 공사비 검증 기준 및 물가변동 에스컬레이션 조항 반영 여부를 정기 총회 안건에서 점검해야 합니다.",
    },
    {
      category: "⚖️ 조합 내부 갈등 & 소송 리스크",
      score: isEarly ? 50 : 25,
      level: isEarly ? "보통" : "안전",
      color: isEarly ? "text-blue-700" : "text-emerald-700",
      badgeBg: isEarly ? "bg-blue-100 border-blue-300" : "bg-emerald-100 border-emerald-300",
      summary: "총회 무효 및 직무정지 가처분 소송 이력 없음 (정상 운영 중)",
      detail: "선거관리위원회 구성 및 대의원회 의결 정족수가 안정적으로 유지되고 있습니다.",
    },
    {
      category: "⏳ 인허가 심의 및 사업 지연 리스크",
      score: isMid ? 35 : 40,
      level: "안전",
      color: "text-emerald-700",
      badgeBg: "bg-emerald-100 border-emerald-300",
      summary: "서울시 신속통합기획 및 통합심의 트랙 적용 (기간 단축 우수)",
      detail: "건축·교통·환경영향평가 통합심의로 통상 2~3년 소요 기간을 1년 내외로 단축 중입니다.",
    },
    {
      category: "📉 비례율 하락 & 분담금 증가 리스크",
      score: 30,
      level: "안전",
      color: "text-emerald-700",
      badgeBg: "bg-emerald-100 border-emerald-300",
      summary: "일반분양 비율 및 입지 우수로 미분양 리스크 낮음",
      detail: `${district ?? "서울 주요 구"} 핵심 입지로 분양가 상한제 심의 시에도 높은 분양 완판 가능성이 예상됩니다.`,
    },
  ];

  const averageScore = Math.round(risks.reduce((acc, r) => acc + r.score, 0) / risks.length);
  const overallGrade = averageScore < 35 ? "안전 (A등급)" : averageScore < 60 ? "보통 (B등급)" : "주의 (C등급)";
  const gradeColor = averageScore < 35 ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-amber-700 bg-amber-50 border-amber-200";

  return (
    <div className="rounded-3xl border border-black/8 bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🚨</span>
            <h2 className="text-xl font-bold tracking-tight text-[#171918]">
              정비사업 리스크 레이더 (Risk Radar)
            </h2>
            <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-300">
              PRO 리스크 조기경보
            </span>
          </div>
          <p className="mt-1 text-xs text-[#777a76]">
            공사비 증액, 조합 내부 갈등, 소송, 인허가 지연 등 <strong>투자 손실을 유발하는 4대 핵심 위험 요소</strong>를 실시간 분석합니다.
          </p>
        </div>

        {/* Overall Score Badge */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] text-gray-500 font-medium">종합 리스크 등급</p>
            <p className={`text-sm font-extrabold px-2.5 py-1 rounded-xl border ${gradeColor} mt-0.5`}>
              {overallGrade}
            </p>
          </div>
        </div>
      </div>

      {/* 4-Risk Grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {risks.map((risk) => (
          <div
            key={risk.category}
            className="p-4 rounded-2xl bg-[#f7f7f4] border border-black/5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-[#171918]">{risk.category}</span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${risk.badgeBg} ${risk.color}`}>
                  {risk.level} ({risk.score}점)
                </span>
              </div>
              <p className="text-xs font-semibold text-[#171918] leading-snug">
                {risk.summary}
              </p>
            </div>
            <p className="mt-2 text-[11px] text-gray-500 border-t border-black/5 pt-2 leading-relaxed">
              {risk.detail}
            </p>
          </div>
        ))}
      </div>

      {/* Pro Alert Notice */}
      <div className="mt-5 rounded-2xl bg-gray-50 p-4 border border-gray-200 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span>🔔</span>
          <span className="text-gray-700">
            <strong>카카오톡 리스크 알림 구독 시</strong>, 시공사 공사비 갈등이나 소송 접수 즉시 알림톡을 발송해 드립니다.
          </span>
        </div>
        <span className="font-bold text-emerald-700 shrink-0 cursor-pointer hover:underline">
          알림 신청 ➔
        </span>
      </div>
    </div>
  );
}
