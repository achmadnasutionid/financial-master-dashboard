"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface AutoExpandInputProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  error?: boolean
}

const AutoExpandInput = React.forwardRef<HTMLTextAreaElement, AutoExpandInputProps>(
  ({ className, value, onChange, error, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)
    
    // Combine refs
    React.useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement)
    
    // Auto-resize on value change
    React.useEffect(() => {
      const textarea = textareaRef.current
      if (textarea) {
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto'
        // Set height to scrollHeight (with min height of 36px = h-9)
        textarea.style.height = `${Math.max(36, textarea.scrollHeight)}px`
      }
    }, [value])

    return (
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        rows={1}
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "resize-none overflow-hidden", // Disable manual resize, hide scrollbar
          "min-h-[36px] leading-5", // Match h-9 input height
          error && "border-destructive focus-visible:ring-destructive",
          className
        )}
        {...props}
      />
    )
  }
)
AutoExpandInput.displayName = "AutoExpandInput"

export { AutoExpandInput }

