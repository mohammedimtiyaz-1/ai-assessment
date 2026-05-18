import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressBarProps {
  progress: number
  color?: string
  className?: string
}

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ progress = 0, color = "bg-gradient-to-r from-indigo-400 to-purple-400", className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("h-2 rounded-full bg-slate-800 overflow-hidden", className)} {...props}>
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", color)}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    )
  }
)
ProgressBar.displayName = "ProgressBar"

export { ProgressBar }
