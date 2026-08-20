export type StageStep = {
  id: number;
  name: string;
  shortName: string;
  status: "completed" | "current" | "upcoming";
  date?: string | null;
  description: string;
};

export const STANDARD_STAGES = [
  {
    id: 1,
    name: "정비구역 지정",
    shortName: "구역지정",
    order: 10,
    aliases: ["정비구역", "정비구역지정", "정비계획 수립", "정비계획", "기본계획", "안전진단"],
    description: "정비구역이 고시되어 개발 사업이 공식화된 단계입니다.",
  },
  {
    id: 2,
    name: "추진위원회 승인",
    shortName: "추진위",
    order: 20,
    aliases: ["추진위원회승인", "추진위원회", "추진위승인", "추진위", "주민대표회의구성통지", "주민대표회의"],
    description: "조합 설립을 준비하기 위한 법적 추진위원회가 승인된 단계입니다.",
  },
  {
    id: 3,
    name: "조합설립인가",
    shortName: "조합설립",
    order: 30,
    aliases: ["조합설립인가", "조합설립", "조합설립인"],
    description: "토지등소유자의 동의를 얻어 정비사업 조합이 공식 인가된 핵심 단계입니다.",
  },
  {
    id: 4,
    name: "사업시행인가",
    shortName: "사업시행",
    order: 40,
    aliases: ["사업시행인가", "사업시행계획인가", "사업시행계획", "사업시행"],
    description: "건축 계획, 세대수, 용적률이 확정되고 시공사 본계약이 진행되는 단계입니다.",
  },
  {
    id: 5,
    name: "관리처분인가",
    shortName: "관리처분",
    order: 50,
    aliases: ["관리처분인가", "관리처분계획인가", "관리처분"],
    description: "조합원 분양가 및 비례율이 확정되고 이주/철거 준비에 들어가는 최종 관문입니다.",
  },
  {
    id: 6,
    name: "착공 및 분양",
    shortName: "착공/분양",
    order: 60,
    aliases: ["착공", "철거", "분양", "일반분양", "착공신고"],
    description: "이주와 철거를 마치고 실제 건축 공사와 일반 분양이 진행되는 단계입니다.",
  },
  {
    id: 7,
    name: "준공 및 입주",
    shortName: "준공/입주",
    order: 70,
    aliases: ["준공인가", "준공", "이전고시", "조합해산", "조합청산", "청산", "해산", "입주"],
    description: "아파트 완공 후 입주 및 소유권 이전고시, 조합 청산이 진행되는 완성 단계입니다.",
  },
];

export function calculateStagePipeline(
  currentStatus: string | null,
  stagesData?: Array<{ stage_name: string; approved_at: string | null }> | null,
  eventsData?: Array<{ title: string; occurred_at: string }> | null
): StageStep[] {
  const normStatus = (currentStatus ?? "").replace(/\s+/g, "");
  let currentStageIndex = 1; // Default to step 1 (정비구역)

  for (let i = 0; i < STANDARD_STAGES.length; i++) {
    const stage = STANDARD_STAGES[i];
    if (stage.aliases.some((alias) => normStatus.includes(alias) || alias.includes(normStatus))) {
      currentStageIndex = stage.id;
    }
  }

  // Check if any stage in stagesData is higher
  if (stagesData && stagesData.length > 0) {
    for (const s of stagesData) {
      const sNorm = s.stage_name.replace(/\s+/g, "");
      for (let i = 0; i < STANDARD_STAGES.length; i++) {
        const stage = STANDARD_STAGES[i];
        if (stage.aliases.some((alias) => sNorm.includes(alias) || alias.includes(sNorm))) {
          if (stage.id > currentStageIndex) {
            currentStageIndex = stage.id;
          }
        }
      }
    }
  }

  // Check if any event in eventsData indicates a higher stage
  if (eventsData && eventsData.length > 0) {
    for (const e of eventsData) {
      const eTitle = e.title.replace(/\s+/g, "");
      for (let i = 0; i < STANDARD_STAGES.length; i++) {
        const stage = STANDARD_STAGES[i];
        // Match specific keywords for stages (e.g. 사업시행인가, 관리처분인가, 조합설립인가)
        if (stage.aliases.some((alias) => eTitle.includes(alias))) {
          if (stage.id > currentStageIndex) {
            currentStageIndex = stage.id;
          }
        }
      }
    }
  }

  // Create date lookup map
  const dateMap = new Map<number, string>();
  if (stagesData) {
    for (const s of stagesData) {
      if (s.approved_at) {
        for (const stage of STANDARD_STAGES) {
          if (stage.aliases.some((a) => s.stage_name.includes(a))) {
            dateMap.set(stage.id, s.approved_at);
          }
        }
      }
    }
  }

  if (eventsData) {
    for (const e of eventsData) {
      for (const stage of STANDARD_STAGES) {
        if (stage.aliases.some((a) => e.title.includes(a)) && !dateMap.has(stage.id)) {
          dateMap.set(stage.id, e.occurred_at);
        }
      }
    }
  }

  return STANDARD_STAGES.map((stage) => {
    let status: "completed" | "current" | "upcoming" = "upcoming";
    if (stage.id < currentStageIndex) {
      status = "completed";
    } else if (stage.id === currentStageIndex) {
      status = "current";
    }

    return {
      id: stage.id,
      name: stage.name,
      shortName: stage.shortName,
      status,
      date: dateMap.get(stage.id) ?? null,
      description: stage.description,
    };
  });
}
