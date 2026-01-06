"use client"

import { useEffect, useState, memo, useCallback } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import { useRouter, useSearchParams } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Pencil, Trash2, Eye, Search, Loader2, Download } from "lucide-react"
import { ListCardSkeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Pagination } from "@/components/ui/pagination"
import { toast } from "sonner"
import Link from "next/link"
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

interface ExpenseItem {
  id: string
  productName: string
  budgeted: number
  actual: number
  difference: number
}

interface Expense {
  id: string
  expenseId: string
  projectName: string
  clientBudget: number
  paidAmount: number
  notes: string | null
  status: string
  items: ExpenseItem[]
  createdAt: string
  updatedAt: string
}

export default function ExpensePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("newest")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [exportYear, setExportYear] = useState<string>("")
  const [isExporting, setIsExporting] = useState(false)
  const [availableYears, setAvailableYears] = useState<number[]>([])

  const fetchExpenses = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      params.append("sortBy", sortBy)

      const response = await fetch(`/api/expense?${params}`, { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setExpenses(data)
      }
    } catch (error) {
      console.error("Error fetching expenses:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableYears = async () => {
    try {
      const response = await fetch("/api/expense/years")
      if (response.ok) {
        const years = await response.json()
        setAvailableYears(years)
        // Set default export year to the most recent year with data
        if (years.length > 0 && !exportYear) {
          setExportYear(years[0].toString())
        }
      }
    } catch (error) {
      console.error("Error fetching available years:", error)
    }
  }

  useEffect(() => {
    fetchExpenses()
  }, [statusFilter, sortBy])

  // Check for refresh parameter - show loading and refetch
  useEffect(() => {
    const refreshParam = searchParams.get("refresh")
    if (refreshParam === "true") {
      // Show loading while fetching fresh data
      setLoading(true)
      fetchExpenses().then(() => {
        // Remove the refresh param from URL after data is loaded
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete("refresh")
        window.history.replaceState({}, '', newUrl.toString())
      })
    }
  }, [searchParams])

  useEffect(() => {
    fetchAvailableYears()
  }, [])

  const [isDeleting, setIsDeleting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 12

  const handleDelete = async () => {
    if (!deleteId || isDeleting) return

    setIsDeleting(true)
    const idToDelete = deleteId
    setDeleteId(null)

    try {
      const response = await fetch(`/api/expense/${idToDelete}`, {
        method: "DELETE",
      })

      if (response.ok) {
        // Refresh the list FIRST, THEN show success toast
        await fetchExpenses()
        toast.success("Expense deleted", {
          description: "The expense has been removed."
        })
      } else {
        toast.error("Failed to delete expense", {
          description: "An error occurred while deleting."
        })
      }
    } catch (error) {
      console.error("Error deleting expense:", error)
      toast.error("Failed to delete expense", {
        description: "An unexpected error occurred."
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleExport = async () => {
    if (isExporting) return
    
    setIsExporting(true)
    try {
      const response = await fetch(`/api/expense/export?year=${exportYear}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `expenses-${exportYear}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        toast.success("Export successful", {
          description: `Expenses for ${exportYear} have been exported.`
        })
      } else {
        toast.error("Export failed", {
          description: "Could not export expenses."
        })
      }
    } catch (error) {
      console.error("Error exporting expenses:", error)
      toast.error("Export failed", {
        description: "An unexpected error occurred."
      })
    } finally {
      setIsExporting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Filter expenses based on search query (debounced for performance)
  const filteredExpenses = expenses.filter((expense) => {
    if (!debouncedSearchQuery.trim()) return true
    
    const query = debouncedSearchQuery.toLowerCase()
    const expenseId = expense.expenseId.toLowerCase()
    const projectName = expense.projectName.toLowerCase()
    
    return expenseId.includes(query) || projectName.includes(query)
  })

  // Sort filtered results
  const sortedFilteredExpenses = [...filteredExpenses].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    } else {
      return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
    }
  })

  // Pagination logic
  const totalItems = sortedFilteredExpenses.length
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
  const paginatedExpenses = sortedFilteredExpenses.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchQuery, statusFilter])

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader title="Expenses" showBackButton={true} />
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
        <div className="container mx-auto max-w-7xl space-y-6">
          {/* Header with filters and create button */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold tracking-tight">Expense List</h2>
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
                <Button onClick={() => router.push("/expense/create")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Expense
                </Button>
              </div>
            </div>

            {/* Export Section */}
            {availableYears.length > 0 && (
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Export:</span>
                <Select value={exportYear} onValueChange={setExportYear}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  onClick={handleExport}
                  disabled={isExporting || !exportYear}
                  className="gap-2"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {isExporting ? "Exporting..." : "Export CSV"}
                </Button>
              </div>
            )}

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by expense ID or project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Expense List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <ListCardSkeleton key={i} />
              ))}
            </div>
          ) : sortedFilteredExpenses.length === 0 ? (
            <Card>
              <CardContent className="py-0">
                <EmptyState
                  type="expenses"
                  isSearchResult={!!debouncedSearchQuery}
                  searchQuery={debouncedSearchQuery}
                  showAction={false}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {paginatedExpenses.map((expense) => {
                const totalBudget = expense.clientBudget // From client budget field
                const totalPaid = expense.paidAmount // From paid amount field
                const totalActual = expense.items.reduce((sum, item) => sum + item.actual, 0)
                const totalDifference = totalPaid - totalActual // Paid - Actual

                return (
                  <Card key={expense.id} className="transition-all hover:shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">
                            {expense.expenseId} - {expense.projectName}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                expense.status === "final"
                                  ? "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100"
                                  : "bg-slate-300 text-slate-900 dark:bg-slate-600 dark:text-slate-100"
                              }`}
                            >
                              {expense.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/expense/${expense.id}/view`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {expense.status !== "final" && (
                            <Link href={`/expense/${expense.id}/edit`}>
                              <Button variant="outline" size="sm">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteId(expense.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <div>
                          <p className="text-xs text-muted-foreground">Client Budget</p>
                          <p className="font-medium">
                            {formatCurrency(expense.clientBudget)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Paid Amount</p>
                          <p className="font-medium">
                            {formatCurrency(expense.paidAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Actual</p>
                          <p className="font-medium">
                            {formatCurrency(totalActual)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Difference</p>
                          <p
                            className={`font-medium ${
                              totalDifference >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {formatCurrency(totalDifference)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Items</p>
                          <p className="font-medium">{expense.items.length} products</p>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <div>
                          <p className="text-xs text-muted-foreground">Saved Under Budget</p>
                          <p
                            className={`font-medium ${
                              totalDifference >= 0 ? "text-green-600" : "text-muted-foreground"
                            }`}
                          >
                            {totalDifference >= 0 ? formatCurrency(totalDifference) : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Over Budget</p>
                          <p
                            className={`font-medium ${
                              totalDifference < 0 ? "text-red-600" : "text-muted-foreground"
                            }`}
                          >
                            {totalDifference < 0 ? formatCurrency(Math.abs(totalDifference)) : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Efficiency</p>
                          <p
                            className={`font-medium ${
                              totalPaid > 0 ? (totalDifference >= 0 ? "text-green-600" : "text-red-600") : ""
                            }`}
                          >
                            {totalPaid > 0 ? `${((totalDifference / totalPaid) * 100).toFixed(2)}%` : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Last Updated</p>
                          <p className="font-medium">
                            {new Date(expense.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div></div>
                      </div>
                      <div className="min-h-[3rem]">
                        <p className="text-xs text-muted-foreground">Notes</p>
                        <p className="text-sm">{expense.notes || "-"}</p>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !isDeleting && !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the expense.
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

      <Footer />
    </div>
  )
}

