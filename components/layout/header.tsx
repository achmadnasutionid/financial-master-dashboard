"use client"

import { useEffect, useState } from "react"
import { Moon, Sun, Home } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function Header() {
  const [currentDate, setCurrentDate] = useState("")
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Update date
    const updateDate = () => {
      const now = new Date()
      const formattedDate = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      setCurrentDate(formattedDate)
    }
    
    updateDate()
    // Update date every minute
    const interval = setInterval(updateDate, 60000)
    
    return () => clearInterval(interval)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 w-full items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="pointer-events-none" disabled>
              <Home className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold tracking-tight">Home</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Loading...</span>
            <Button variant="ghost" size="icon" disabled>
              <Sun className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 w-full items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="pointer-events-none">
            <Home className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold tracking-tight">Home</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-muted-foreground sm:inline-block">
            {currentDate}
          </span>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all" />
            ) : (
              <Moon className="h-5 w-5 rotate-0 scale-100 transition-all" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>
  )
}

