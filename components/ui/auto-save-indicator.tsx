"use client"

import { Cloud, CloudOff, Loader2, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error"

interface AutoSaveIndicatorProps {
  status: AutoSaveStatus
  className?: string
}

export function AutoSaveIndicator({ status, className }: AutoSaveIndicatorProps) {
  if (status === "idle") return null

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm transition-all duration-300",
        status === "saving" && "text-muted-foreground",
        status === "saved" && "text-green-600 dark:text-green-500",
        status === "error" && "text-destructive",
        className
      )}
    >
      {status === "saving" && (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Saving...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Cloud className="h-4 w-4" />
          <span>Saved</span>
        </>
      )}
      {status === "error" && (
        <>
          <CloudOff className="h-4 w-4" />
          <span>Failed to save</span>
        </>
      )}
    </div>
  )
}

