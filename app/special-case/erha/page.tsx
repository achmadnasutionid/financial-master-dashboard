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

interface ErhaTicket {
  id: string
  ticketId: string
  companyName: string
  billTo: string
  productionDate: string
  totalAmount: number
  status: string
  generatedInvoiceId?: string
  createdAt: string
  updatedAt: string
}

function ErhaTicketPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tickets, setTickets] = useState<ErhaTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("newest")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null)
  const [finalizeDialogId, setFinalizeDialogId] = useState<string | null>(null)
  const [generateInvoiceDialogId, setGenerateInvoiceDialogId] = useState<string | null>(null)

  // Set initial filter from URL query parameter
  useEffect(() => {
    const statusParam = searchParams.get("status")
    if (statusParam && ["draft", "final"].includes(statusParam)) {
      setStatusFilter(statusParam)
    }
  }, [searchParams])

  const fetchTickets = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      params.append("sortBy", sortBy)

      const response = await fetch(`/api/erha?${params}`, { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setTickets(data)
      }
    } catch (error) {
      console.error("Error fetching erha tickets:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [statusFilter, sortBy])

  // Check for refresh parameter - show loading and refetch
  useEffect(() => {
    const refreshParam = searchParams.get("refresh")
    if (refreshParam === "true") {
      // Show loading while fetching fresh data
      setLoading(true)
      fetchTickets().then(() => {
        // Remove the refresh param from URL after data is loaded
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete("refresh")
        window.history.replaceState({}, '', newUrl.toString())
      })
    }
  }, [searchParams])

  const [isDeleting, setIsDeleting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 12

  const handleDelete = async () => {
    if (!deleteId || isDeleting) return

    setIsDeleting(true)
    const idToDelete = deleteId
    setDeleteId(null)

    try {
      const response = await fetch(`/api/erha/${idToDelete}`, {
        method: "DELETE",
      })

      if (response.ok) {
        // Refresh the list FIRST, THEN show success toast
        await fetchTickets()
        toast.success("Erha ticket deleted", {
          description: "The ticket has been removed."
        })
      } else {
        toast.error("Failed to delete erha ticket", {
          description: "An error occurred while deleting."
        })
      }
    } catch (error) {
      console.error("Error deleting erha ticket:", error)
      toast.error("Failed to delete erha ticket", {
        description: "An unexpected error occurred."
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleFinalize = async (ticketId: string) => {
    if (accepting) return
    
    // Optimistic update: update status immediately
    const previousTickets = [...tickets]
    setTickets(tickets.map(t => 
      t.id === ticketId ? { ...t, status: "final" } : t
    ))
    
    setAccepting(ticketId)
    try {
      const response = await fetch(`/api/erha/${ticketId}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        const data = await response.json()
        toast.success("Ticket finalized and draft expense created!", {
          description: `Expense ${data.expense.expenseId} has been created.`
        })
        // Refresh to get updated data (invoice ID, etc.)
        fetchTickets()
      } else {
        // Revert optimistic update on error
        setTickets(previousTickets)
        const errorData = await response.json()
        toast.error("Failed to finalize ticket", {
          description: errorData.error || "An error occurred"
        })
      }
    } catch (error) {
      // Revert optimistic update on error
      setTickets(previousTickets)
      console.error("Error finalizing ticket:", error)
      toast.error("Failed to finalize ticket")
    } finally {
      setAccepting(null)
    }
  }

  const handleGenerateInvoice = async (ticketId: string) => {
    setGeneratingInvoice(ticketId)
    try {
      const response = await fetch(`/api/erha/${ticketId}/generate-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId })
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

  // Filter tickets based on search query (debounced for performance)
  const filteredTickets = tickets.filter((ticket) => {
    if (!debouncedSearchQuery.trim()) return true
    
    const query = debouncedSearchQuery.toLowerCase()
    const ticketId = ticket.ticketId.toLowerCase()
    const companyName = ticket.companyName.toLowerCase()
    const billTo = ticket.billTo.toLowerCase()
    
    // Priority: exact match or starts with query
    if (ticketId === query || companyName.startsWith(query) || billTo.startsWith(query)) {
      return true
    }
    
    // Then include partial matches
    return ticketId.includes(query) || companyName.includes(query) || billTo.includes(query)
  })

  // Sort filtered results: exact/starts-with matches first
  const sortedFilteredTickets = [...filteredTickets].sort((a, b) => {
    if (!debouncedSearchQuery.trim()) return 0
    
    const query = debouncedSearchQuery.toLowerCase()
    
    const getScore = (ticket: ErhaTicket) => {
      const ticketId = ticket.ticketId.toLowerCase()
      const companyName = ticket.companyName.toLowerCase()
      const billTo = ticket.billTo.toLowerCase()
      
      if (ticketId === query) return 3
      if (companyName === query || billTo === query) return 2
      if (ticketId.startsWith(query) || companyName.startsWith(query) || billTo.startsWith(query)) return 1
      return 0
    }
    
    return getScore(b) - getScore(a)
  })

  // Pagination logic
  const totalItems = sortedFilteredTickets.length
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
  const paginatedTickets = sortedFilteredTickets.slice(
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
        <PageHeader title="Erha Ticket" showBackButton={true} />
        <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
          <div className="container mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="h-7 w-44 animate-pulse rounded bg-muted" />
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
      <PageHeader title="Erha Ticket" showBackButton={true} />
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
        <div className="container mx-auto max-w-7xl space-y-6">
          {/* Header with filters and create button */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold tracking-tight">Erha Ticket List</h2>
              <div className="flex flex-wrap gap-2">
                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
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
                <Link href="/special-case/erha/create">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Erha Ticket
                  </Button>
                </Link>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by Ticket ID or Client Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Ticket List */}
          {sortedFilteredTickets.length === 0 ? (
            <Card>
              <CardContent className="py-0">
                <EmptyState
                  type="erha-tickets"
                  isSearchResult={!!debouncedSearchQuery}
                  searchQuery={debouncedSearchQuery}
                  showAction={false}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {paginatedTickets.map((ticket) => (
                <Card key={ticket.id} className="transition-all hover:shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          {ticket.ticketId} - {ticket.billTo}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              ticket.status === "accepted"
                                ? "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100"
                                : ticket.status === "pending"
                                ? "bg-slate-300 text-slate-900 dark:bg-slate-600 dark:text-slate-100"
                                : "bg-slate-300 text-slate-900 dark:bg-slate-600 dark:text-slate-100"
                            }`}
                          >
                            {ticket.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/special-case/erha/${ticket.id}/view`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {ticket.status !== "final" && (
                          <Link href={`/special-case/erha/${ticket.id}/edit`}>
                            <Button variant="outline" size="sm">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteId(ticket.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Client</p>
                        <p className="font-medium">{ticket.billTo}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Production Date</p>
                        <p className="font-medium">
                          {new Date(ticket.productionDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Amount</p>
                        <p className="font-medium">
                          {formatCurrency(ticket.totalAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Last Updated</p>
                        <p className="font-medium">
                          {new Date(ticket.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {ticket.status === "pending" && (
                      <div className="flex justify-end pt-2">
                        <Button
                          onClick={() => setFinalizeDialogId(ticket.id)}
                          disabled={accepting === ticket.id}
                          size="sm"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          {accepting === ticket.id ? "Finalizing..." : "Finalize Ticket"}
                        </Button>
                      </div>
                    )}
                    {ticket.status === "accepted" && (
                      <div className="flex justify-end pt-2">
                        {ticket.generatedInvoiceId ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewInvoice(ticket.generatedInvoiceId!)}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            View Invoice
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setGenerateInvoiceDialogId(ticket.id)}
                            disabled={generatingInvoice === ticket.id}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            {generatingInvoice === ticket.id ? "Generating..." : "Generate Invoice"}
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              
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
              This action cannot be undone. This will permanently delete the erha ticket.
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

      {/* Finalize Confirmation Dialog */}
      <AlertDialog open={!!finalizeDialogId} onOpenChange={(open) => !accepting && !open && setFinalizeDialogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize Ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              This will finalize the ticket and lock all changes. You can then generate quotation, invoice, and BAST documents. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!accepting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (finalizeDialogId) {
                  handleFinalize(finalizeDialogId)
                  setFinalizeDialogId(null)
                }
              }}
              disabled={!!accepting}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {accepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finalizing...
                </>
              ) : (
                "Finalize"
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
              This will create a new invoice based on this ticket&apos;s quotation. The invoice will be linked to this ticket.
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

export default function ErhaTicketPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <ErhaTicketPageContent />
    </Suspense>
  )
}
