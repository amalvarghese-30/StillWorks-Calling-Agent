import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#16A34A] text-white hover:bg-[#15803D]",
        secondary:
          "border-transparent bg-gray-100 text-gray-800 hover:bg-gray-200",
        success:
          "border-transparent bg-[#DCFCE7] text-[#16A34A]",
        warning:
          "border-transparent bg-[#FEF9C3] text-[#CA8A04]",
        destructive:
          "border-transparent bg-red-100 text-red-700",
        info:
          "border-transparent bg-blue-100 text-blue-700",
        outline: "text-gray-600 border-gray-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
