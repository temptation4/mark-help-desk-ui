import { Loader2 } from "lucide-react"
import { cn } from "cn"

function Spinner({ className, ...props }) {
  return (
    <Loader2
      data-slot="spinner"
      className={cn("h-4 w-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
