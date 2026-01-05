"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import ReactDatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  error?: boolean
}

export function DatePicker({ date, onDateChange, placeholder = "Pick a date", disabled = false, error = false }: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  
  // Check if date is valid
  const isValidDate = date && !isNaN(date.getTime())

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !isValidDate && "text-muted-foreground",
            error && "border-destructive focus:ring-destructive"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {isValidDate ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <ReactDatePicker
          selected={isValidDate ? date : undefined}
          onChange={(date) => {
            onDateChange?.(date || undefined)
            setIsOpen(false)
          }}
          inline
          calendarClassName="!border-0 !shadow-none"
        />
      </PopoverContent>
    </Popover>
  )
}

