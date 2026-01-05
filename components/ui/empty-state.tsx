"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  Building2, 
  Package, 
  CreditCard, 
  FileSignature,
  FileText,
  Receipt,
  ClipboardList,
  Calculator,
  Ticket,
  Search,
  Plus,
  FolderOpen
} from "lucide-react"

export type EmptyStateType = 
  | "companies" 
  | "products" 
  | "billings" 
  | "signatures" 
  | "quotations" 
  | "invoices" 
  | "plannings" 
  | "expenses" 
  | "paragon-tickets"
  | "erha-tickets"
  | "search"
  | "generic"

interface EmptyStateProps {
  type: EmptyStateType
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  showAction?: boolean
  className?: string
  isSearchResult?: boolean
  searchQuery?: string
}

const emptyStateConfig: Record<EmptyStateType, {
  icon: React.ComponentType<{ className?: string }>
  defaultTitle: string
  defaultDescription: string
  searchTitle: string
  searchDescription: string
  gradient: string
  iconColor: string
}> = {
  companies: {
    icon: Building2,
    defaultTitle: "No companies yet",
    defaultDescription: "Get started by adding your first company to the system.",
    searchTitle: "No companies found",
    searchDescription: "Try adjusting your search terms or filters.",
    gradient: "from-blue-500/10 to-cyan-500/10",
    iconColor: "text-blue-500"
  },
  products: {
    icon: Package,
    defaultTitle: "No products yet",
    defaultDescription: "Create your first product to start building your catalog.",
    searchTitle: "No products found",
    searchDescription: "Try adjusting your search terms.",
    gradient: "from-emerald-500/10 to-teal-500/10",
    iconColor: "text-emerald-500"
  },
  billings: {
    icon: CreditCard,
    defaultTitle: "No billing accounts yet",
    defaultDescription: "Add your first billing account to manage payments.",
    searchTitle: "No billing accounts found",
    searchDescription: "Try adjusting your search terms.",
    gradient: "from-violet-500/10 to-purple-500/10",
    iconColor: "text-violet-500"
  },
  signatures: {
    icon: FileSignature,
    defaultTitle: "No signatures yet",
    defaultDescription: "Create your first signature to use in documents.",
    searchTitle: "No signatures found",
    searchDescription: "Try adjusting your search terms.",
    gradient: "from-amber-500/10 to-orange-500/10",
    iconColor: "text-amber-500"
  },
  quotations: {
    icon: FileText,
    defaultTitle: "No quotations yet",
    defaultDescription: "Create your first quotation to start making proposals.",
    searchTitle: "No quotations found",
    searchDescription: "Try adjusting your search or filter criteria.",
    gradient: "from-sky-500/10 to-blue-500/10",
    iconColor: "text-sky-500"
  },
  invoices: {
    icon: Receipt,
    defaultTitle: "No invoices yet",
    defaultDescription: "Invoices will appear here once quotations are accepted.",
    searchTitle: "No invoices found",
    searchDescription: "Try adjusting your search or filter criteria.",
    gradient: "from-rose-500/10 to-pink-500/10",
    iconColor: "text-rose-500"
  },
  plannings: {
    icon: ClipboardList,
    defaultTitle: "No plannings yet",
    defaultDescription: "Create your first planning to organize your projects.",
    searchTitle: "No plannings found",
    searchDescription: "Try adjusting your search or filter criteria.",
    gradient: "from-indigo-500/10 to-violet-500/10",
    iconColor: "text-indigo-500"
  },
  expenses: {
    icon: Calculator,
    defaultTitle: "No expenses yet",
    defaultDescription: "Expenses will appear here when invoices are paid.",
    searchTitle: "No expenses found",
    searchDescription: "Try adjusting your search or filter criteria.",
    gradient: "from-lime-500/10 to-green-500/10",
    iconColor: "text-lime-600"
  },
  "paragon-tickets": {
    icon: Ticket,
    defaultTitle: "No Paragon tickets yet",
    defaultDescription: "Create your first Paragon ticket to get started.",
    searchTitle: "No Paragon tickets found",
    searchDescription: "Try adjusting your search or filter criteria.",
    gradient: "from-fuchsia-500/10 to-pink-500/10",
    iconColor: "text-fuchsia-500"
  },
  "erha-tickets": {
    icon: Ticket,
    defaultTitle: "No Erha tickets yet",
    defaultDescription: "Create your first Erha ticket to get started.",
    searchTitle: "No Erha tickets found",
    searchDescription: "Try adjusting your search or filter criteria.",
    gradient: "from-cyan-500/10 to-teal-500/10",
    iconColor: "text-cyan-500"
  },
  search: {
    icon: Search,
    defaultTitle: "No results found",
    defaultDescription: "Try adjusting your search terms.",
    searchTitle: "No results found",
    searchDescription: "We couldn't find anything matching your search.",
    gradient: "from-gray-500/10 to-slate-500/10",
    iconColor: "text-gray-500"
  },
  generic: {
    icon: FolderOpen,
    defaultTitle: "Nothing here yet",
    defaultDescription: "This section is empty.",
    searchTitle: "No results found",
    searchDescription: "Try adjusting your search.",
    gradient: "from-gray-500/10 to-slate-500/10",
    iconColor: "text-gray-500"
  }
}

export function EmptyState({
  type,
  title,
  description,
  actionLabel,
  onAction,
  showAction = true,
  className,
  isSearchResult = false,
  searchQuery
}: EmptyStateProps) {
  const config = emptyStateConfig[type]
  const Icon = config.icon

  const displayTitle = title || (isSearchResult ? config.searchTitle : config.defaultTitle)
  const displayDescription = description || (isSearchResult 
    ? (searchQuery ? `No results for "${searchQuery}"` : config.searchDescription) 
    : config.defaultDescription)

  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 px-4 text-center",
      className
    )}>
      {/* Decorative background */}
      <div className={cn(
        "relative mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br",
        config.gradient
      )}>
        {/* Animated rings */}
        <div className="absolute inset-0 animate-ping rounded-full bg-current opacity-5" style={{ animationDuration: "3s" }} />
        <div className="absolute -inset-2 rounded-full border-2 border-dashed border-current opacity-10" />
        <Icon className={cn("h-10 w-10", config.iconColor)} />
      </div>

      {/* Content */}
      <h3 className="mb-2 text-lg font-semibold tracking-tight">
        {displayTitle}
      </h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        {displayDescription}
      </p>

      {/* Action button */}
      {showAction && onAction && actionLabel && (
        <Button onClick={onAction} className="gap-2">
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

