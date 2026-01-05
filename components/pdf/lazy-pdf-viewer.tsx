"use client"

import dynamic from "next/dynamic"
import { ReactElement, useState, useEffect } from "react"
import { Loader2 } from "lucide-react"

// Dynamically import PDFViewer with no SSR (it uses browser APIs)
const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted rounded-lg">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading PDF viewer...</p>
        </div>
      </div>
    ),
  }
)

interface LazyPDFViewerProps {
  children: ReactElement
  className?: string
  style?: React.CSSProperties
  showToolbar?: boolean
}

export function LazyPDFViewer({ children, className, style, showToolbar = true }: LazyPDFViewerProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className || ''}`} style={style}>
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Preparing document...</p>
        </div>
      </div>
    )
  }

  return (
    <PDFViewer className={className} style={style as any} showToolbar={showToolbar}>
      {children as any}
    </PDFViewer>
  )
}

