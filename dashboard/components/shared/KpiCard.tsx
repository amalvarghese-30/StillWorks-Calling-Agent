import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: string;
  changePositive?: boolean;
  icon: LucideIcon;
  className?: string;
}

export default function KpiCard({
  title,
  value,
  change,
  changePositive,
  icon: Icon,
  className,
}: KpiCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-[#6B7280]">{title}</span>
          <div className="w-9 h-9 rounded-lg bg-[#DCFCE7] flex items-center justify-center">
            <Icon className="w-5 h-5 text-[#16A34A]" />
          </div>
        </div>
        <div className="text-3xl font-bold text-[#111827] mb-1">{value}</div>
        {change && (
          <div className="flex items-center gap-1">
            {changePositive !== undefined && (
              changePositive ? (
                <TrendingUp className="w-3 h-3 text-[#16A34A]" />
              ) : (
                <TrendingDown className="w-3 h-3 text-[#DC2626]" />
              )
            )}
            <span
              className={cn(
                "text-xs font-medium",
                changePositive === undefined
                  ? "text-[#6B7280]"
                  : changePositive
                  ? "text-[#16A34A]"
                  : "text-[#DC2626]"
              )}
            >
              {change}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
