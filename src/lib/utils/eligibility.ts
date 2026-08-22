/**
 * Legal Eligibility & Liquidation Shield Engine (도정법 제39조 기반 조합원 지위양도 판정 모듈)
 * 
 * 법적 기준:
 * 1. 투기과열지구 (강남구, 서초구, 송파구, 용산구):
 *    - 재건축: '조합설립인가' 이후 매수 시 원칙적 입주권 승계 금지 (현금청산 대상)
 *    - 재개발: '관리처분계획인가' 이후 매수 시 원칙적 입주권 승계 금지
 *    - 합법 승계 예외: 매도인이 1세대 1주택자로서 10년 이상 보유 + 5년 이상 거주한 매물 (도정법 제39조 제2항 제5호)
 * 2. 비규제지역 (그 외 서울 21개 자치구):
 *    - 재개발: 소유권이전고시(준공)까지 자유롭게 조합원 자격 승계 가능
 *    - 재건축: 착공 전까지 자유롭게 승계 가능
 * 3. 공통:
 *    - 권리산정기준일 이후 신축 쪼개기(지분 쪼개기) 매물은 무조건 현금청산 대상
 */

export const SPECULATIVE_DISTRICTS = ["강남구", "서초구", "송파구", "용산구"];

export type EligibilityDiagnosis = {
  isSpeculativeDistrict: boolean;
  statusLevel: "SAFE" | "CHECK_REQUIRED" | "HIGH_RISK";
  statusTitle: string;
  statusBadge: string;
  badgeBg: string;
  badgeColor: string;
  legalBasis: string;
  summary: string;
  exceptions: string[];
  requiredDocs: string[];
};

export function diagnoseMembershipEligibility(
  district: string | null,
  projectType: string | null,
  currentStatus: string | null
): EligibilityDiagnosis {
  const isSpeculative = district ? SPECULATIVE_DISTRICTS.includes(district) : false;
  const isRecon = (projectType ?? "").includes("재건축");
  const isRedev = !isRecon; // 재개발 or 도시정비형

  const status = currentStatus ?? "";
  const isBeforeUnion = /정비구역|추진위|지정/.test(status);
  const isUnionApproved = /조합설립/.test(status);
  const isBusinessApproved = /사업시행/.test(status);
  const isManagementApproved = /관리처분|착공|준공|분양|철거/.test(status);

  // 1. 투기과열지구 재건축 (압구정, 반포, 대치, 잠실 등)
  if (isSpeculative && isRecon) {
    if (isBeforeUnion) {
      return {
        isSpeculativeDistrict: true,
        statusLevel: "SAFE",
        statusTitle: "조합설립 전: 조합원 지위양도 자유 매수 가능",
        statusBadge: "🟢 매수 안전 (조합설립 전)",
        badgeBg: "bg-emerald-100 border-emerald-300",
        badgeColor: "text-emerald-800",
        legalBasis: "도시 및 주거환경정비법 제39조 제2항",
        summary: "현재 조합설립인가 전 단계로, 누구든지 매수 시 100% 정상적으로 조합원 자격과 입주권을 취득할 수 있습니다.",
        exceptions: ["향후 조합설립인가 고시일 전까지 등기 접수가 완료되어야 안전합니다."],
        requiredDocs: ["토지/건물 등기부등본", "건축물대장"],
      };
    }

    // 조합설립인가 이후 (조합설립, 사업시행, 관리처분 등)
    return {
      isSpeculativeDistrict: true,
      statusLevel: "HIGH_RISK",
      statusTitle: "투기과열지구 재건축: 10년보유·5년거주 1주택자 매물만 승계 가능",
      statusBadge: "🔴 현금청산 주의 (승계요건 확인 필수)",
      badgeBg: "bg-rose-100 border-rose-300",
      badgeColor: "text-rose-800",
      legalBasis: "도정법 제39조 제2항 제5호 (1세대 1주택자 양도 특례)",
      summary: "조합설립인가가 완료된 투기과열지구 재건축 단지입니다. 일반 매물 매수 시 조합원 자격이 승계되지 않고 현금청산(물딱지) 대상이 됩니다.",
      exceptions: [
        "매도인이 1세대 1주택자로서 10년 이상 보유하고 5년 이상 거주한 매물 (합법 승계)",
        "조합설립인가일로부터 3년 이상 사업시행인가 미신청 시 3년 이상 보유자 매물",
        "사업시행인가일로부터 3년 이상 미착공 시 3년 이상 보유자 매물",
        "근무상·생업상 사정, 질병치료, 취학, 결혼으로 세대원 전원 타지역 이전 매물",
      ],
      requiredDocs: [
        "매도인 주민등록초본 (5년 이상 거주 이력 확인용)",
        "매도인 등기부등본 (10년 이상 보유 이력 확인용)",
        "매도인 세대원 전원 무주택 확인서 (1세대 1주택 검증)",
        "조합 사무실 확인서 (조합원 지위양도 가능 매물 사전 검인)",
      ],
    };
  }

  // 2. 투기과열지구 재개발 (한남뉴타운 등)
  if (isSpeculative && isRedev) {
    if (!isManagementApproved) {
      return {
        isSpeculativeDistrict: true,
        statusLevel: "SAFE",
        statusTitle: "관리처분 전: 조합원 지위양도 자유 매수 가능",
        statusBadge: "🟢 매수 안전 (관리처분인가 전)",
        badgeBg: "bg-emerald-100 border-emerald-300",
        badgeColor: "text-emerald-800",
        legalBasis: "도시 및 주거환경정비법 제39조 제2항 (재개발)",
        summary: "투기과열지구 재개발은 '관리처분계획인가' 전까지는 매수 시 정상적으로 조합원 입주권을 승계받을 수 있습니다.",
        exceptions: [
          "관리처분인가 고시일 이후에는 10년 보유 5년 거주 1주택자 매물만 승계 가능합니다.",
          "권리산정기준일 이후 준공된 신축 쪼개기 지분 매물은 제외 대상입니다.",
        ],
        requiredDocs: ["등기부등본", "조합원 명부상 다물권자 여부 확인(동일 구역 내 매도인 타 매물 유무)"],
      };
    }

    return {
      isSpeculativeDistrict: true,
      statusLevel: "HIGH_RISK",
      statusTitle: "관리처분인가 완료: 조합원 지위양도 제한 (특례 매물만 가능)",
      statusBadge: "🔴 현금청산 주의 (관리처분인가 후)",
      badgeBg: "bg-rose-100 border-rose-300",
      badgeColor: "text-rose-800",
      legalBasis: "도정법 제39조 제2항 (관리처분 이후 지위양도 제한)",
      summary: "관리처분계획인가가 났으므로 일반 매수 시 현금청산 대상입니다. 법정 10년보유·5년거주 1주택자 매물만 입주권 승계가 가능합니다.",
      exceptions: [
        "매도인이 10년 이상 보유 + 5년 이상 거주한 1세대 1주택자 매물",
        "상속·근무·질병으로 인한 세대원 전원 이전 매물",
      ],
      requiredDocs: ["매도인 초본/등기부등본", "1세대 1주택 확인서", "조합 확인서"],
    };
  }

  // 3. 비규제지역 재개발 & 재건축 (마포로1-24, 성수, 노량진, 이문, 북아현 등 서울 21개 자치구)
  return {
    isSpeculativeDistrict: false,
    statusLevel: "SAFE",
    statusTitle: "비규제지역: 조합원 지위양도 제한 없이 자유 매수 가능",
    statusBadge: "🟢 전매 제한 없음 (자유 매수 안전)",
    badgeBg: "bg-emerald-100 border-emerald-300",
    badgeColor: "text-emerald-800",
    legalBasis: "도정법 제39조 (비규제지역 규제 완화)",
    summary: `${district ?? "해당 자치구"}는 투기과열지구가 아니므로, 관리처분인가 이후에도 소유권 이전고시(준공)까지 조합원 자격을 제한 없이 안전하게 승계받으실 수 있습니다.`,
    exceptions: [
      "단, 동일 구역 내 매도인이 여러 주택을 보유한 '다물권자' 매물인지 조합 사무실에서 사전 확인 필요 (1조합원 1입주권 원칙).",
      "권리산정기준일 이후 지분 쪼개기 매물 여부 확인.",
    ],
    requiredDocs: ["등기부등본", "건축물대장", "조합 사무실 다물권자 확인원"],
  };
}
