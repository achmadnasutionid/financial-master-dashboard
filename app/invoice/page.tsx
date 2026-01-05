"use client"

import { useEffect, useState, memo, useCallback } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import { PageHeader } from "@/components/layout/page-header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Pencil, Trash2, Eye, Search, CheckCircle, FileText, Loader2 } from "lucide-react"
import { ListCardSkeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Pagination } from "@/components/ui/pagination"
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

interface Invoice {
  id: string
  invoiceId: string
  companyName: string
  billTo: string
  productionDate: string
  totalAmount: number
  status: string
  generatedExpenseId?: string
  createdAt: string
  updatedAt: string
  items: {
    productName: string
    total: number
  }[]
}

export default function InvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("newest")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)
  const [markPaidDialogId, setMarkPaidDialogId] = useState<string | null>(null)

  // Set initial filter from URL query parameter
  useEffect(() => {
    const statusParam = searchParams.get("status")
    if (statusParam && ["draft", "pending", "paid"].includes(statusParam)) {
      setStatusFilter(statusParam)
    }
  }, [searchParams])

  const fetchInvoices = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      params.append("sortBy", sortBy)

      const response = await fetch(`/api/invoice?${params}`)
      if (response.ok) {
        const data = await response.json()
        setInvoices(data)
      }
    } catch (error) {
      console.error("Error fetching invoices:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [statusFilter, sortBy])

  const [isDeleting, setIsDeleting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 12

  const handleDelete = async () => {
    if (!deleteId || isDeleting) return

    const idToDelete = deleteId
    
    // Optimistic update: remove from UI immediately
    const previousInvoices = [...invoices]
    setInvoices(invoices.filter((q) => q.id !== idToDelete))
    setDeleteId(null)

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/invoice/${idToDelete}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Invoice deleted", {
          description: "The invoice has been removed."
        })
      } else {
        // Revert optimistic update on error
        setInvoices(previousInvoices)
        toast.error("Failed to delete invoice", {
          description: "An error occurred while deleting."
        })
      }
    } catch (error) {
      // Revert optimistic update on error
      setInvoices(previousInvoices)
      console.error("Error deleting invoice:", error)
      toast.error("Failed to delete invoice", {
        description: "An unexpected error occurred."
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleMarkPaid = async (invoiceId: string) => {
    if (markingPaid) return
    
    // Optimistic update: update status immediately
    const previousInvoices = [...invoices]
    setInvoices(invoices.map(inv => 
      inv.id === invoiceId ? { ...inv, status: "paid" } : inv
    ))
    
    setMarkingPaid(invoiceId)
    try {
      // First, mark invoice as paid
      const response = await fetch(`/api/invoice/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      })

      if (response.ok) {
        // Then create expense and redirect
        const expenseResponse = await fetch(`/api/invoice/${invoiceId}/create-expense`, {
          method: "POST"
        })

        if (expenseResponse.ok) {
          const expense = await expenseResponse.json()
          toast.success("Invoice marked as paid!", {
            description: "Redirecting to expense form..."
          })
          // Redirect to expense edit page
          router.push(`/expense/${expense.id}/edit`)
        } else {
          // Revert optimistic update on error
          setInvoices(previousInvoices)
          const errorData = await expenseResponse.json()
          toast.error("Failed to create expense", {
            description: errorData.error || "An error occurred."
          })
        }
      } else {
        // Revert optimistic update on error
        setInvoices(previousInvoices)
        const errorData = await response.json()
        toast.error("Failed to mark invoice as paid", {
          description: errorData.error || "An error occurred."
        })
      }
    } catch (error) {
      // Revert optimistic update on error
      setInvoices(previousInvoices)
      console.error("Error marking invoice as paid:", error)
      toast.error("Failed to mark invoice as paid", {
        description: error instanceof Error ? error.message : "An unexpected error occurred."
      })
    } finally {
      setMarkingPaid(null)
    }
  }

  const handleViewExpense = async (expenseId: string) => {
    try {
      const response = await fetch(`/api/expense/${expenseId}`)
      if (response.ok) {
        const expense = await response.json()
        // Navigate to edit if draft, view if final
        if (expense.status === "final") {
          router.push(`/expense/${expenseId}/view`)
        } else {
          router.push(`/expense/${expenseId}/edit`)
        }
      } else {
        toast.error("Failed to load expense")
      }
    } catch (error) {
      console.error("Error fetching expense:", error)
      toast.error("Failed to load expense")
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
  const getProfitTotal = (items: Invoice["items"]) => {
    const photographerItem = items.find(item => item.productName.toUpperCase() === "PHOTOGRAPHER")
    return photographerItem ? photographerItem.total : null
  }

  // Filter invoices based on search query (debounced for performance)
  const filteredInvoices = invoices.filter((invoice) => {
    if (!debouncedSearchQuery.trim()) return true
    
    const query = debouncedSearchQuery.toLowerCase()
    const invoiceId = invoice.invoiceId.toLowerCase()
    const companyName = invoice.companyName.toLowerCase()
    const billTo = invoice.billTo.toLowerCase()
    
    // Priority: exact match or starts with query
    if (invoiceId === query || companyName.startsWith(query) || billTo.startsWith(query)) {
      return true
    }
    
    // Then include partial matches
    return invoiceId.includes(query) || companyName.includes(query) || billTo.includes(query)
  })

  // Sort filtered results: exact/starts-with matches first
  const sortedFilteredInvoices = [...filteredInvoices].sort((a, b) => {
    if (!debouncedSearchQuery.trim()) return 0
    
    const query = debouncedSearchQuery.toLowerCase()
    
    const getScore = (invoice: Invoice) => {
      const invoiceId = invoice.invoiceId.toLowerCase()
      const companyName = invoice.companyName.toLowerCase()
      const billTo = invoice.billTo.toLowerCase()
      
      if (invoiceId === query) return 3
      if (companyName === query || billTo === query) return 2
      if (invoiceId.startsWith(query) || companyName.startsWith(query) || billTo.startsWith(query)) return 1
      return 0
    }
    
    return getScore(b) - getScore(a)
  })

  // Pagination logic
  const totalItems = sortedFilteredInvoices.length
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
  const paginatedInvoices = sortedFilteredInvoices.slice(
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
        <PageHeader title="Invoice" showBackButton={true} />
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
      <PageHeader title="Invoice" showBackButton={true} />
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
        <div className="container mx-auto max-w-7xl space-y-6">
          {/* Header with filters and create button */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold tracking-tight">Invoice List</h2>
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
                    <SelectItem value="paid">Paid</SelectItem>
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
                <Link href="/invoice/create">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Invoice
                  </Button>
                </Link>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by Invoice ID or Client Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Invoice List */}
          {sortedFilteredInvoices.length === 0 ? (
            <Card>
              <CardContent className="py-0">
                <EmptyState
                  type="invoices"
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
                  Invoice
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
              {paginatedInvoices.map((Invoice) => {
                const profitTotal = getProfitTotal(Invoice.items)
                return (
                  <Card key={Invoice.id} className="transition-all hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        {/* Left: ID - Bill To */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="font-semibold text-sm whitespace-nowrap">
                            {Invoice.invoiceId}
                          </span>
                          <span className="text-muted-foreground">-</span>
                          <span className="font-medium text-sm truncate">
                            {Invoice.billTo}
                          </span>
                        </div>

                        {/* Middle: Status, Production Date, Total Amount, Profit Total */}
                        <div className="hidden lg:flex items-center gap-4">
                          <div style={{ width: '100px' }}>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
                                Invoice.status === "paid"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100"
                                  : Invoice.status === "pending"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100"
                                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100"
                              }`}
                            >
                              {Invoice.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-sm font-medium" style={{ width: '90px' }}>
                            {new Date(Invoice.productionDate).toLocaleDateString('en-GB')}
                          </div>
                          <div className="text-sm font-semibold text-right" style={{ width: '125px' }}>
                            {formatCurrency(Invoice.totalAmount)}
                          </div>
                          <div className="text-sm font-medium text-right" style={{ width: '125px' }}>
                            {profitTotal ? formatCurrency(profitTotal) : "-"}
                          </div>
                        </div>

                        {/* Right: Action Buttons */}
                        <div className="flex items-center gap-1 justify-end" style={{ width: '152px' }}>
                          {Invoice.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => setMarkPaidDialogId(Invoice.id)}
                              disabled={markingPaid === Invoice.id}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {Invoice.status === "paid" && Invoice.generatedExpenseId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => handleViewExpense(Invoice.generatedExpenseId!)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          <Link href={`/invoice/${Invoice.id}/view`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {Invoice.status !== "paid" && (
                            <Link href={`/invoice/${Invoice.id}/edit`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteId(Invoice.id)}
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
              This action cannot be undone. This will permanently delete the Invoice.
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

      {/* Mark Paid Confirmation Dialog */}
      <AlertDialog open={!!markPaidDialogId} onOpenChange={(open) => !markingPaid && !open && setMarkPaidDialogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Invoice as Paid?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the invoice as paid and create an expense record. This action tracks the payment in your expense management.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!markingPaid}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (markPaidDialogId) {
                  handleMarkPaid(markPaidDialogId)
                  setMarkPaidDialogId(null)
                }
              }}
              disabled={!!markingPaid}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {markingPaid ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Mark as Paid"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


