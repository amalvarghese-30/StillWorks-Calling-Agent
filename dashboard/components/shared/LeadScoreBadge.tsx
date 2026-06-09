import { cn } from "@/lib/utils";

interface LeadScoreBadgeProps {
  score: number;
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-[#16A34A] bg-[#DCFCE7]";
  if (score >= 60) return "text-[#CA8A04] bg-[#FEF9C3]";
  if (score >= 40) return "text-yellow-700 bg-yellow-50";
  return "text-gray-600 bg-gray-100";
}

function getScoreDot(score: number): string {
  if (score >= 80) return "bg-[#16A34A]";
  if (score >= 60) return "bg-[#CA8A04]";
  if (score >= 40) return "bg-yellow-500";
  return "bg-gray-400";
}

export default function LeadScoreBadge({ score, className }: LeadScoreBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold",
        getScoreColor(score),
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", getScoreDot(score))} />
      {score}
    </span>
  );
}
