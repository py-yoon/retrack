"use client";

type ProjectPdfReportButtonProps = {
  projectName: string;
  district: string | null;
  currentStatus: string | null;
};

export default function ProjectPdfReportButton({
  projectName,
  district,
  currentStatus,
}: ProjectPdfReportButtonProps) {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3.5 py-1.5 text-xs font-bold text-[#171918] transition hover:bg-black/5 shadow-2xs cursor-pointer print:hidden"
      title="상담 및 보관용 A4 1장 PDF 리포트로 인쇄/저장"
    >
      <span>📄</span>
      <span>구역 브리핑 PDF 다운로드 / 인쇄</span>
    </button>
  );
}
