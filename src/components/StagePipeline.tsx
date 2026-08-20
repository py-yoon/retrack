import { StageStep } from "@/lib/utils/stages";

type StagePipelineProps = {
  steps: StageStep[];
  currentStatus: string | null;
};

export default function StagePipeline({ steps, currentStatus }: StagePipelineProps) {
  const currentStep = steps.find((s) => s.status === "current") || steps[0];
  const nextStep = steps.find((s) => s.id === currentStep.id + 1);

  return (
    <div className="rounded-3xl border border-black/8 bg-white p-6 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 pb-4">
        <div>
          <span className="text-xs font-semibold text-[#777a76]">정비사업 추진 현황</span>
          <div className="mt-1 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-lg font-bold text-[#171918]">
              현재 {currentStatus ?? currentStep.name} 단계
            </h3>
          </div>
        </div>
        {nextStep && (
          <div className="rounded-xl bg-[#f7f7f4] px-3.5 py-2 text-xs text-[#555]">
            다음 단계: <strong className="text-[#171918]">{nextStep.name}</strong>
          </div>
        )}
      </div>

      {/* Visual Pipeline Steps */}
      <div className="mt-6 space-y-4">
        {steps.map((step, idx) => {
          const isCompleted = step.status === "completed";
          const isCurrent = step.status === "current";

          return (
            <div key={step.id} className="relative flex items-start gap-4">
              {/* Vertical connector line */}
              {idx !== steps.length - 1 && (
                <div
                  className={`absolute left-[15px] top-[28px] h-full w-[2px] -translate-x-1/2 ${
                    isCompleted ? "bg-emerald-500" : "bg-black/10"
                  }`}
                />
              )}

              {/* Step indicator circle */}
              <div
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  isCompleted
                    ? "bg-emerald-500 text-white shadow-sm"
                    : isCurrent
                    ? "border-2 border-emerald-500 bg-white text-emerald-600 ring-4 ring-emerald-100"
                    : "border border-black/15 bg-white text-[#989b96]"
                }`}
              >
                {isCompleted ? "✓" : step.id}
              </div>

              {/* Step details */}
              <div className="min-w-0 flex-1 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-bold ${
                        isCurrent
                          ? "text-emerald-700"
                          : isCompleted
                          ? "text-[#171918]"
                          : "text-[#989b96]"
                      }`}
                    >
                      {step.name}
                    </span>
                    {isCurrent && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        진행 중
                      </span>
                    )}
                    {isCompleted && (
                      <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-[#555]">
                        완료
                      </span>
                    )}
                  </div>

                  {step.date && (
                    <time className="font-mono text-xs text-[#777a76]">
                      {step.date.replaceAll("-", ".")}
                    </time>
                  )}
                </div>

                <p
                  className={`mt-1 text-xs leading-relaxed ${
                    isCurrent ? "text-[#444]" : "text-[#777a76]"
                  }`}
                >
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
