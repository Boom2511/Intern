import * as React from "react"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  indeterminate?: boolean
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className = "", value = 0, max = 100, indeterminate = false, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100))

    return (
      <div
        ref={ref}
        className={`relative h-2 w-full overflow-hidden rounded-full bg-gray-200 ${className}`}
        {...props}
      >
        <div
          className={`h-full transition-all duration-300 ease-in-out ${
            indeterminate
              ? 'bg-blue-600 animate-progress-indeterminate'
              : 'bg-blue-600'
          }`}
          style={
            indeterminate
              ? undefined
              : { width: `${percentage}%` }
          }
        />
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress }
