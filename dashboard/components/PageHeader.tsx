import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-6", className)}>
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">{title}</h1>
        {description && (
          <p className="text-sm text-[#6B7280] mt-1">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
