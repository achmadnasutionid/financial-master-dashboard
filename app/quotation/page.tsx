"use client"

import { useEffect, useState, memo, useCallback, Suspense } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import { PageHeader } from "@/components/layout/page-header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Pencil, Trash2, Eye, Search, CheckCircle, FileText, Loader2 } from "lucide-react"
import { ListCardSkeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Pagination, usePagination } from "@/components/ui/pagination"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Quotation {
  id: string
  quotationId: string
  companyName: string
  billTo: string
  productionDate: string
  totalAmount: number
  status: string
  generatedInvoiceId?: string
  createdAt: string
  updatedAt: string
  items: {
    productName: string
    total: number
  }[]
}

function QuotationPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("newest")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null)
  const [acceptDialogId, setAcceptDialogId] = useState<string | null>(null)
  const [generateInvoiceDialogId, setGenerateInvoiceDialogId] = useState<string | null>(null)

  // Set initial filter from URL query parameter
  useEffect(() => {
    const statusParam = searchParams.get("status")
    if (statusParam && ["draft", "pending", "accepted"].includes(statusParam)) {
      setStatusFilter(statusParam)
    }
    
    // Check for refresh parameter - show loading and refetch
    const refreshParam = searchParams.get("refresh")
    if (refreshParam === "true") {
      // Show loading while fetching fresh data
      setLoading(true)
      fetchQuotations().then(() => {
        // Remove the refresh param from URL after data is loaded
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete("refresh")
        window.history.replaceState({}, '', newUrl.toString())
      })
    }
  }, [searchParams])

  const fetchQuotations = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      params.append("sortBy", sortBy)

      const response = await fetch(`/api/quotation?${params}`, { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setQuotations(data)
      }
    } catch (error) {
      console.error("Error fetching quotations:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuotations()
  }, [statusFilter, sortBy])

  const [isDeleting, setIsDeleting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 12

  const handleDelete = async () => {
    if (!deleteId || isDeleting) return

    setIsDeleting(true)
    const idToDelete = deleteId
    setDeleteId(null)

    try {
      const response = await fetch(`/api/quotation/${idToDelete}`, {
        method: "DELETE",
      })

      if (response.ok) {
        // Refresh the list FIRST, THEN show success toast
        await fetchQuotations()
        toast.success("Quotation deleted", {
          description: "The quotation has been removed."
        })
      } else {
        toast.error("Failed to delete quotation", {
          description: "An error occurred while deleting."
        })
      }
    } catch (error) {
      console.error("Error deleting quotation:", error)
      toast.error("Failed to delete quotation", {
        description: "An unexpected error occurred."
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAccept = async (quotationId: string) => {
    if (accepting) return
    
    setAccepting(quotationId)
    try {
      const response = await fetch(`/api/quotation/${quotationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" }),
      })

      if (response.ok) {
        // Refresh the list FIRST, THEN show success toast
        await fetchQuotations()
        toast.success("Quotation accepted", {
          description: "The quotation has been marked as accepted."
        })
      } else {
        toast.error("Failed to accept quotation", {
          description: "An error occurred while updating status."
        })
      }
    } catch (error) {
      console.error("Error accepting quotation:", error)
      toast.error("Failed to accept quotation", {
        description: "An unexpected error occurred."
      })
    } finally {
      setAccepting(null)
    }
  }

  const handleGenerateInvoice = async (quotationId: string) => {
    if (generatingInvoice) return
    setGeneratingInvoice(quotationId)
    try {
      const response = await fetch(`/api/quotation/${quotationId}/generate-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotationId })
      })

      if (response.ok) {
        const newInvoice = await response.json()
        toast.success("Invoice generated!", {
          description: "Redirecting to invoice edit page..."
        })
        
        // Redirect to invoice edit page
        router.push(`/invoice/${newInvoice.id}/edit`)
      } else {
        const data = await response.json()
        toast.error("Failed to generate invoice", {
          description: data.error || "An error occurred."
        })
      }
    } catch (error) {
      console.error("Error generating invoice:", error)
      toast.error("Failed to generate invoice", {
        description: "An unexpected error occurred."
      })
    } finally {
      setGeneratingInvoice(null)
    }
  }

  const handleViewInvoice = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoice/${invoiceId}`)
      const invoiceData = await res.json()
      
      if (invoiceData.status === "paid") {
        router.push(`/invoice/${invoiceId}/view`)
      } else {
        router.push(`/invoice/${invoiceId}/edit`)
      }
    } catch (error) {
      console.error("Error fetching invoice:", error)
      toast.error("Failed to load invoice")
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Calculate profit (photographer) total from items
  const getProfitTotal = (items: Quotation["items"]) => {
    const photographerItem = items.find(item => item.productName.toUpperCase() === "PHOTOGRAPHER")
    return photographerItem ? photographerItem.total : null
  }

  // Filter quotations based on search query (debounced for performance)
  const filteredQuotations = quotations.filter((quotation) => {
    if (!debouncedSearchQuery.trim()) return true
    
    const query = debouncedSearchQuery.toLowerCase()
    const quotationId = quotation.quotationId.toLowerCase()
    const companyName = quotation.companyName.toLowerCase()
    const billTo = quotation.billTo.toLowerCase()
    
    // Priority: exact match or starts with query
    if (quotationId === query || companyName.startsWith(query) || billTo.startsWith(query)) {
      return true
    }
    
    // Then include partial matches
    return quotationId.includes(query) || companyName.includes(query) || billTo.includes(query)
  })

  // Sort filtered results: exact/starts-with matches first
  const sortedFilteredQuotations = [...filteredQuotations].sort((a, b) => {
    if (!debouncedSearchQuery.trim()) return 0
    
    const query = debouncedSearchQuery.toLowerCase()
    
    const getScore = (quotation: Quotation) => {
      const quotationId = quotation.quotationId.toLowerCase()
      const companyName = quotation.companyName.toLowerCase()
      const billTo = quotation.billTo.toLowerCase()
      
      if (quotationId === query) return 3
      if (companyName === query || billTo === query) return 2
      if (quotationId.startsWith(query) || companyName.startsWith(query) || billTo.startsWith(query)) return 1
      return 0
    }
    
    return getScore(b) - getScore(a)
  })

  // Pagination logic
  const totalItems = sortedFilteredQuotations.length
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
  const paginatedQuotations = sortedFilteredQuotations.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchQuery, statusFilter])

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <PageHeader title="Quotation" showBackButton={true} />
        <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
          <div className="container mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="h-7 w-40 animate-pulse rounded bg-muted" />
              <div className="flex gap-2">
                <div className="h-10 w-32 animate-pulse rounded bg-muted" />
                <div className="h-10 w-32 animate-pulse rounded bg-muted" />
                <div className="h-10 w-40 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <ListCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader title="Quotation" showBackButton={true} />
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
        <div className="container mx-auto max-w-7xl space-y-6">
          {/* Header with filters and create button */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold tracking-tight">Quotation List</h2>
              <div className="flex flex-wrap gap-2">
                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                  </SelectContent>
                </Select>

                {/* Create Button */}
                <Link href="/quotation/create">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Quotation
                  </Button>
                </Link>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by Quotation ID or Client Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Quotation List */}
          {sortedFilteredQuotations.length === 0 ? (
            <Card>
              <CardContent className="py-0">
                <EmptyState
                  type="quotations"
                  isSearchResult={!!debouncedSearchQuery}
                  searchQuery={debouncedSearchQuery}
                  showAction={false}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {/* Header Row */}
              <div className="hidden lg:flex items-center justify-between gap-4 px-4 py-2 bg-muted/50 rounded-lg">
                <div className="flex-1 text-xs font-semibold text-muted-foreground uppercase">
                  Quotation
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase" style={{ width: '100px' }}>
                    Status
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase" style={{ width: '90px' }}>
                    Date
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase text-right" style={{ width: '125px' }}>
                    Total
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase text-right" style={{ width: '125px' }}>
                    Profit
                  </div>
                </div>
                <div style={{ width: '152px' }} className="text-xs font-semibold text-muted-foreground uppercase text-center">
                  Actions
                </div>
              </div>

              {/* Data Rows */}
              {paginatedQuotations.map((quotation) => {
                const profitTotal = getProfitTotal(quotation.items)
                return (
                  <Card key={quotation.id} className="transition-all hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        {/* Left: ID - Bill To */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="font-semibold text-sm whitespace-nowrap">
                            {quotation.quotationId}
                          </span>
                          <span className="text-muted-foreground">-</span>
                          <span className="font-medium text-sm truncate">
                            {quotation.billTo}
                          </span>
                        </div>

                        {/* Middle: Status, Production Date, Total Amount, Profit Total */}
                        <div className="hidden lg:flex items-center gap-4">
                          <div style={{ width: '100px' }}>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
                                quotation.status === "accepted"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100"
                                  : quotation.status === "pending"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100"
                                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100"
                              }`}
                            >
                              {quotation.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-sm font-medium" style={{ width: '90px' }}>
                            {new Date(quotation.productionDate).toLocaleDateString('en-GB')}
                          </div>
                          <div className="text-sm font-semibold text-right" style={{ width: '125px' }}>
                            {formatCurrency(quotation.totalAmount)}
                          </div>
                          <div className="text-sm font-medium text-right" style={{ width: '125px' }}>
                            {profitTotal ? formatCurrency(profitTotal) : "-"}
                          </div>
                        </div>

                        {/* Right: Action Buttons */}
                        <div className="flex items-center gap-1 justify-end" style={{ width: '152px' }}>
                          {quotation.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => setAcceptDialogId(quotation.id)}
                              disabled={accepting === quotation.id}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {quotation.status === "accepted" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => {
                                if (quotation.generatedInvoiceId) {
                                  handleViewInvoice(quotation.generatedInvoiceId)
                                } else {
                                  setGenerateInvoiceDialogId(quotation.id)
                                }
                              }}
                              disabled={generatingInvoice === quotation.id}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          <Link href={`/quotation/${quotation.id}/view`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {quotation.status !== "accepted" && (
                            <Link href={`/quotation/${quotation.id}/edit`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteId(quotation.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
              
              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={totalItems}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !isDeleting && !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the quotation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Accept Confirmation Dialog */}
      <AlertDialog open={!!acceptDialogId} onOpenChange={(open) => !accepting && !open && setAcceptDialogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept Quotation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the quotation as accepted. You can then generate an invoice from this quotation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!accepting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (acceptDialogId) {
                  handleAccept(acceptDialogId)
                  setAcceptDialogId(null)
                }
              }}
              disabled={!!accepting}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {accepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accepting...
                </>
              ) : (
                "Accept"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generate Invoice Confirmation Dialog */}
      <AlertDialog open={!!generateInvoiceDialogId} onOpenChange={(open) => !generatingInvoice && !open && setGenerateInvoiceDialogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new invoice based on this quotation. The invoice will be linked to this quotation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!generatingInvoice}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (generateInvoiceDialogId) {
                  handleGenerateInvoice(generateInvoiceDialogId)
                  setGenerateInvoiceDialogId(null)
                }
              }}
              disabled={!!generatingInvoice}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {generatingInvoice ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Invoice"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function QuotationPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <QuotationPageContent />
    </Suspense>
  )
}
