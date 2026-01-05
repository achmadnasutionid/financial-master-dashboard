"use client"

import * as React from "react"
import { NumericFormat } from "react-number-format"
import { cn } from "@/lib/utils"

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value?: string | number
  onValueChange?: (value: string) => void
  error?: boolean
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onValueChange, placeholder = "Rp 0", error, ...props }, ref) => {
    return (
      <NumericFormat
        getInputRef={ref}
        value={value || ""}
        onValueChange={(values) => {
          if (onValueChange) {
            onValueChange(values.value)
          }
        }}
        thousandSeparator="."
        decimalSeparator=","
        prefix="Rp "
        allowNegative={false}
        placeholder={placeholder}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive focus-visible:ring-destructive",
          className
        )}
        {...props}
      />
    )
  }
)
CurrencyInput.displayName = "CurrencyInput"

export { CurrencyInput }

