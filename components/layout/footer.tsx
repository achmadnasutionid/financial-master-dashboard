export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 w-full items-center justify-center px-4">
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm text-muted-foreground">
            Financial Master Dashboard © {currentYear}
          </p>
          <p className="text-xs text-muted-foreground/60">
            You've reached the bottom of the page
          </p>
        </div>
      </div>
    </footer>
  )
}

