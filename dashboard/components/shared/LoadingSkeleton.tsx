import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  rows?: number;
  variant?: "table" | "card" | "kpi";
  className?: string;
}

export default function LoadingSkeleton({
  rows = 5,
  variant = "table",
  className,
}: LoadingSkeletonProps) {
  if (variant === "card") {
    return (
      <div className={cn("space-y-3", className)}>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (variant === "kpi") {
    return (
      <div className={cn("space-y-2", className)}>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-32" />
      </div>
    );
  }

  // Table variant
  return (
    <div className={cn("space-y-3", className)}>
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
