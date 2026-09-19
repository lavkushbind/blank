import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "destructive";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2",
        {
          "border-transparent bg-indigo-50 text-indigo-700": variant === "default",
          "border-transparent bg-emerald-50 text-emerald-800": variant === "success",
          "border-transparent bg-amber-50 text-amber-800": variant === "warning",
          "border-transparent bg-red-50 text-red-800": variant === "destructive",
        },
        className
      )}
      {...props}
    />
  )
}
export { Badge }