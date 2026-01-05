"use client"

import { useState, useCallback, memo, useEffect } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Plus, Trash2, Pencil, Check, X, ChevronLeft, ChevronRight, Banknote } from "lucide-react"
import { toast } from "sonner"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { EmptyState } from "@/components/ui/empty-state"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/utils"
import { DatePicker } from "@/components/ui/date-picker"

interface BigExpense {
  id: string
  name: string
  amount: number
  date: string | null
  year: number
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

// Memoized table row component
const ExpenseRow = memo(function ExpenseRow({
  expense,
  isEditing,
  editingData,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onEditChange,
  onDateChange,
}: {
  expense: BigExpense
  isEditing: boolean
  editingData: { name: string; amount: string; date: Date | undefined } | null
  onEdit: (expense: BigExpense) => void
  onSave: () => void
  onCancel: () => void
  onDelete: (id: string) => void
  onEditChange: (field: "name" | "amount", value: string) => void
  onDateChange: (date: Date | undefined) => void
}) {
  if (isEditing && editingData) {
    return (
      <TableRow>
        <TableCell>
          <Input
            value={editingData.name}
            onChange={(e) => onEditChange("name", e.target.value)}
            placeholder="Expense name"
            className="w-full"
          />
        </TableCell>
        <TableCell>
          <DatePicker
            date={editingData.date}
            onDateChange={onDateChange}
            placeholder="Pick date"
          />
        </TableCell>
        <TableCell>
          <CurrencyInput
            value={editingData.amount}
            onValueChange={(value) => onEditChange("amount", value)}
            placeholder="0"
          />
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button size="icon" variant="ghost" onClick={onSave}>
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onCancel}>
              <X className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{expense.name}</TableCell>
      <TableCell className="text-muted-foreground">
        {expense.date ? formatDate(expense.date) : "-"}
      </TableCell>
      <TableCell>{formatCurrency(expense.amount)}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onEdit(expense)}
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(expense.id)}
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
})

export default function BigExpensesPage() {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [expenses, setExpenses] = useState<BigExpense[]>([])
  const [allYearsTotal, setAllYearsTotal] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  // New expense state
  const [isAdding, setIsAdding] = useState(false)
  const [newExpense, setNewExpense] = useState<{ name: string; amount: string; date: Date | undefined }>({ 
    name: "", 
    amount: "", 
    date: undefined 
  })

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<{ name: string; amount: string; date: Date | undefined } | null>(null)

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null)

  // Fetch all expenses total (all years)
  const fetchAllYearsTotal = useCallback(async () => {
    try {
      const res = await fetch("/api/big-expenses")
      const data = await res.json()
      const total = data
        .filter((e: BigExpense) => !e.deletedAt)
        .reduce((sum: number, exp: BigExpense) => sum + exp.amount, 0)
      setAllYearsTotal(total)
    } catch (error) {
      console.error("Error fetching all expenses:", error)
    }
  }, [])

  // Fetch expenses for selected year
  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/big-expenses?year=${selectedYear}`)
      const data = await res.json()
      setExpenses(data.filter((e: BigExpense) => !e.deletedAt))
    } catch (error) {
      console.error("Error fetching expenses:", error)
      toast.error("Failed to fetch expenses")
    } finally {
      setLoading(false)
    }
  }, [selectedYear])

  useEffect(() => {
    fetchExpenses()
    fetchAllYearsTotal()
  }, [fetchExpenses, fetchAllYearsTotal])

  // Calculate total for selected year
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)

  // Year navigation
  const handlePrevYear = () => setSelectedYear((prev) => prev - 1)
  const handleNextYear = () => setSelectedYear((prev) => prev + 1)

  // Add new expense
  const handleAdd = async () => {
    if (!newExpense.name.trim()) {
      toast.error("Please enter expense name")
      return
    }
    if (!newExpense.amount || parseFloat(newExpense.amount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    try {
      const res = await fetch("/api/big-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newExpense.name,
          amount: parseFloat(newExpense.amount),
          date: newExpense.date ? newExpense.date.toISOString() : null,
          year: selectedYear,
        }),
      })

      if (res.ok) {
        const newItem = await res.json()
        // Update local state immediately
        setExpenses((prev) => [newItem, ...prev])
        setAllYearsTotal((prev) => prev + parseFloat(newExpense.amount))
        setNewExpense({ name: "", amount: "", date: undefined })
        setIsAdding(false)
        toast.success("Expense added")
      } else {
        toast.error("Failed to add expense")
      }
    } catch (error) {
      console.error("Error adding expense:", error)
      toast.error("Failed to add expense")
    }
  }

  // Edit expense
  const handleEdit = useCallback((expense: BigExpense) => {
    setEditingId(expense.id)
    setEditingData({
      name: expense.name,
      amount: expense.amount.toString(),
      date: expense.date ? new Date(expense.date) : undefined,
    })
  }, [])

  const handleEditChange = useCallback((field: "name" | "amount", value: string) => {
    setEditingData((prev) =>
      prev ? { ...prev, [field]: value } : null
    )
  }, [])

  const handleEditDateChange = useCallback((date: Date | undefined) => {
    setEditingData((prev) =>
      prev ? { ...prev, date } : null
    )
  }, [])

  const handleSave = useCallback(async () => {
    if (!editingId || !editingData) return

    const expense = expenses.find((e) => e.id === editingId)
    if (!expense) return

    try {
      const res = await fetch(`/api/big-expenses/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingData.name,
          amount: parseFloat(editingData.amount),
          date: editingData.date ? editingData.date.toISOString() : null,
          year: expense.year,
        }),
      })

      if (res.ok) {
        const updatedItem = await res.json()
        const oldExpense = expenses.find((e) => e.id === editingId)
        const amountDiff = parseFloat(editingData.amount) - (oldExpense?.amount || 0)
        // Update local state immediately
        setExpenses((prev) =>
          prev.map((e) => (e.id === editingId ? updatedItem : e))
        )
        setAllYearsTotal((prev) => prev + amountDiff)
        setEditingId(null)
        setEditingData(null)
        toast.success("Expense updated")
      } else {
        toast.error("Failed to update expense")
      }
    } catch (error) {
      console.error("Error updating expense:", error)
      toast.error("Failed to update expense")
    }
  }, [editingId, editingData])

  const handleCancel = useCallback(() => {
    setEditingId(null)
    setEditingData(null)
  }, [])

  // Delete expense
  const handleDeleteClick = useCallback((id: string) => {
    setExpenseToDelete(id)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteConfirm = async () => {
    if (!expenseToDelete) return

    try {
      const res = await fetch(`/api/big-expenses/${expenseToDelete}`, {
        method: "DELETE",
      })

      if (res.ok) {
        const deletedExpense = expenses.find((e) => e.id === expenseToDelete)
        // Update local state immediately
        setExpenses((prev) => prev.filter((e) => e.id !== expenseToDelete))
        setAllYearsTotal((prev) => prev - (deletedExpense?.amount || 0))
        toast.success("Expense deleted")
      } else {
        toast.error("Failed to delete expense")
      }
    } catch (error) {
      console.error("Error deleting expense:", error)
      toast.error("Failed to delete expense")
    } finally {
      setDeleteDialogOpen(false)
      setExpenseToDelete(null)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="Big Expenses"
        showBackButton
        backTo="/"
      />

      <main className="flex-1 px-4 py-8 md:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Special Case" },
              { label: "Big Expenses" },
            ]}
          />

          {/* Total Expenses Card with Year Selector */}
          <Card className="mb-8 mt-6 border-2 border-primary/20">
            <CardContent className="py-8">
              <div className="flex flex-col gap-6">
                {/* Year Selector - scroll through years */}
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePrevYear}
                    title="Previous year"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <span className="text-3xl font-bold min-w-[100px] text-center">
                    {selectedYear}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextYear}
                    disabled={selectedYear >= currentYear}
                    title="Next year"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>

                {/* Two Totals Side by Side */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Left - All Years Total */}
                  <div className="flex items-center gap-4 rounded-lg border p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Banknote className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        All Years Total
                      </p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(allYearsTotal)}
                      </p>
                    </div>
                  </div>

                  {/* Right - Selected Year Total */}
                  <div className="flex items-center gap-4 rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Banknote className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {selectedYear} Total
                      </p>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(totalExpenses)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expenses Table */}
          <Card>
            <CardContent className="p-0">
              {/* Add button at top */}
              {!isAdding && !loading && (
                <div className="border-b p-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsAdding(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Expense for {selectedYear}
                  </Button>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Expense Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        <div className="flex items-center justify-center">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {/* Add new row - at the top */}
                      {isAdding && (
                        <TableRow>
                          <TableCell>
                            <Input
                              value={newExpense.name}
                              onChange={(e) =>
                                setNewExpense({ ...newExpense, name: e.target.value })
                              }
                              placeholder="Expense name"
                              className="w-full"
                              autoFocus
                            />
                          </TableCell>
                          <TableCell>
                            <DatePicker
                              date={newExpense.date}
                              onDateChange={(date) =>
                                setNewExpense({ ...newExpense, date })
                              }
                              placeholder="Pick date"
                            />
                          </TableCell>
                          <TableCell>
                            <CurrencyInput
                              value={newExpense.amount}
                              onValueChange={(value) =>
                                setNewExpense({ ...newExpense, amount: value })
                              }
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="icon" variant="ghost" onClick={handleAdd}>
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setIsAdding(false)
                                  setNewExpense({ name: "", amount: "", date: undefined })
                                }}
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Active expenses */}
                      {expenses.map((expense) => (
                        <ExpenseRow
                          key={expense.id}
                          expense={expense}
                          isEditing={editingId === expense.id}
                          editingData={editingId === expense.id ? editingData : null}
                          onEdit={handleEdit}
                          onSave={handleSave}
                          onCancel={handleCancel}
                          onDelete={handleDeleteClick}
                          onEditChange={handleEditChange}
                          onDateChange={handleEditDateChange}
                        />
                      ))}

                      {/* Empty state */}
                      {!loading && expenses.length === 0 && !isAdding && (
                        <TableRow>
                          <TableCell colSpan={4} className="h-32">
                            <EmptyState
                              type="expenses"
                              onAction={() => setIsAdding(true)}
                              actionLabel="Add Expense"
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

