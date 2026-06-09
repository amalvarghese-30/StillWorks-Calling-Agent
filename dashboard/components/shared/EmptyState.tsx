import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4", className)}>
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-[#DCFCE7] flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-[#16A34A]" />
        </div>
      )}
      <h3 className="text-base font-semibold text-[#111827] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[#6B7280] text-center max-w-sm">{description}</p>
      )}
    </div>
  );
}
