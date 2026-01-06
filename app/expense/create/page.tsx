"use client"

import { useEffect, useState, useRef } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CurrencyInput } from "@/components/ui/currency-input"
import { DatePicker } from "@/components/ui/date-picker"
import { Save, CheckCircle, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { AutoSaveIndicator, AutoSaveStatus } from "@/components/ui/auto-save-indicator"
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

interface ExpenseItem {
  id: string
  productName: string
  budgeted: string
  actual: string
  difference: number
}

export default function CreateExpensePage() {
  const router = useRouter()
  
  // Form fields
  const [projectName, setProjectName] = useState("")
  const [productionDate, setProductionDate] = useState<Date | null>(null)
  const [clientBudget, setClientBudget] = useState("0")
  const [paidAmount, setPaidAmount] = useState("0")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<ExpenseItem[]>([{
    id: Date.now().toString(),
    productName: "",
    budgeted: "0",
    actual: "0",
    difference: 0
  }])
  const [products, setProducts] = useState<string[]>([])
  const [dateInput, setDateInput] = useState("") // For manual date input
  
  // UI state
  const [saving, setSaving] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle")
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [errors, setErrors] = useState<any>({})
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false)

  // Fetch products
  useEffect(() => {
    fetch("/api/products")
      .then(res => res.json())
      .then(productsData => {
        setProducts(productsData.map((p: any) => p.name))
      })
      .catch(console.error)
  }, [])

  // Mark as interacted on first change
  const markInteracted = () => {
    if (!hasInteracted) {
      setHasInteracted(true)
    }
  }

  // Parse DD/MM/YYYY format to Date
  const parseDateInput = (input: string): Date | null => {
    const match = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (!match) return null
    
    const day = parseInt(match[1], 10)
    const month = parseInt(match[2], 10) - 1 // Month is 0-indexed
    const year = parseInt(match[3], 10)
    
    const date = new Date(year, month, day)
    
    // Validate the date
    if (
      date.getDate() !== day ||
      date.getMonth() !== month ||
      date.getFullYear() !== year
    ) {
      return null // Invalid date
    }
    
    return date
  }

  // Handle manual date input
  const handleDateInputChange = (value: string) => {
    setDateInput(value)
    markInteracted()
    
    // Try to parse the date if it matches DD/MM/YYYY format
    const parsedDate = parseDateInput(value)
    if (parsedDate) {
      setProductionDate(parsedDate)
    } else if (value === '') {
      setProductionDate(null)
    }
  }

  // Auto-save function
  const autoSave = async () => {
    if (!hasInteracted || !projectName.trim() || !productionDate) {
      return
    }

    // Filter out items with empty product names before saving
    const validItems = items.filter(item => item.productName.trim() !== '')
    
    if (validItems.length === 0) {
      return // Don't auto-save if there are no valid items
    }

    try {
      setAutoSaveStatus("saving")
      
      const payload = {
        projectName: projectName.trim(),
        productionDate: productionDate!.toISOString(),
        clientBudget: parseFloat(clientBudget) || 0,
        paidAmount: parseFloat(paidAmount) || 0,
        notes: notes.trim() || null,
        status: "draft",
        totalItemBudgeted: validItems.reduce((sum, item) => sum + (parseFloat(item.budgeted) || 0), 0),
        totalItemDifferences: validItems.reduce((sum, item) => sum + item.difference, 0),
        items: validItems.map(item => ({
          productName: item.productName,
          budgeted: parseFloat(item.budgeted) || 0,
          actual: parseFloat(item.actual) || 0
        }))
      }

      const response = await fetch("/api/expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        setAutoSaveStatus("saved")
        toast.success("Draft saved", {
          description: "Redirecting to edit page..."
        })
        // Redirect to edit page after saving
        setTimeout(() => {
          router.push(`/expense/${data.id}/edit`)
        }, 500)
      } else {
        const error = await response.json()
        setAutoSaveStatus("error")
        toast.error("Auto-save failed", {
          description: error.error || "Failed to save draft"
        })
      }
    } catch (error) {
      console.error("Auto-save error:", error)
      setAutoSaveStatus("error")
      toast.error("Auto-save failed", {
        description: "An error occurred while saving"
      })
    }
  }

  // Auto-save timer
  useEffect(() => {
    if (hasInteracted) {
      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }

      // Set new timer
      autoSaveTimerRef.current = setTimeout(() => {
        autoSave()
      }, 30000) // 30 seconds
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [projectName, productionDate, clientBudget, paidAmount, notes, items, hasInteracted])

  const updateItem = (itemId: string, field: string, value: string) => {
    markInteracted()
    setItems(items.map(item => {
      if (item.id !== itemId) return item

      const updated = { ...item, [field]: value }
      
      const budgeted = parseFloat(updated.budgeted) || 0
      const actual = parseFloat(updated.actual) || 0
      updated.difference = budgeted - actual

      return updated
    }))
  }

  const addItem = () => {
    markInteracted()
    const newItem: ExpenseItem = {
      id: Date.now().toString(),
      productName: "",
      budgeted: "0",
      actual: "0",
      difference: 0
    }
    setItems([...items, newItem])
  }

  const removeItem = (itemId: string) => {
    if (items.length > 1) {
      markInteracted()
      setItems(items.filter(item => item.id !== itemId))
    }
  }

  const calculateTotals = () => {
    const totalBudget = parseFloat(clientBudget) || 0
    const totalPaid = parseFloat(paidAmount) || 0
    const totalActual = items.reduce((sum, item) => sum + (parseFloat(item.actual) || 0), 0)
    const totalDifference = totalPaid - totalActual
    
    const totalItemBudgeted = items.reduce((sum, item) => sum + (parseFloat(item.budgeted) || 0), 0)
    const totalItemDifferences = items.reduce((sum, item) => sum + item.difference, 0)
    
    return { totalBudget, totalPaid, totalActual, totalDifference, totalItemBudgeted, totalItemDifferences }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const validateField = (field: string, value: string | Date | null) => {
    const fieldErrors: any = { ...errors }
    
    switch (field) {
      case "projectName":
        if (!value || (typeof value === "string" && !value.trim())) {
          fieldErrors.projectName = "Project name is required"
        } else {
          delete fieldErrors.projectName
        }
        break
      case "productionDate":
        if (!value) {
          fieldErrors.productionDate = "Production date is required"
        } else {
          delete fieldErrors.productionDate
        }
        break
    }
    
    setErrors(fieldErrors)
  }

  const validateForm = () => {
    const newErrors: any = {}
    if (!projectName.trim()) newErrors.projectName = "Project name is required"
    if (!productionDate) newErrors.productionDate = "Production date is required"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (status: "draft" | "final") => {
    if (saving) return
    if (!validateForm()) {
      toast.error("Validation failed", {
        description: "Please fill in all required fields"
      })
      return
    }

    if (status === "final") {
      if (items.length === 0 || items.every(item => !item.productName.trim())) {
        toast.warning("Cannot finalize expense", {
          description: "Please add at least one expense item."
        })
        return
      }
    }

    // Validate that all items have product names (for both draft and final)
    const itemsWithEmptyNames = items.filter(item => !item.productName.trim())
    if (itemsWithEmptyNames.length > 0) {
      toast.error("Validation failed", {
        description: "All expense items must have a product name. Please fill in or remove empty items."
      })
      return
    }

    setSaving(true)
    try {
      const payload = {
        projectName: projectName.trim(),
        productionDate: productionDate!.toISOString(),
        clientBudget: parseFloat(clientBudget) || 0,
        paidAmount: parseFloat(paidAmount) || 0,
        notes: notes.trim() || null,
        status,
        totalItemBudgeted: items.reduce((sum, item) => sum + (parseFloat(item.budgeted) || 0), 0),
        totalItemDifferences: items.reduce((sum, item) => sum + item.difference, 0),
        items: items.map(item => ({
          productName: item.productName,
          budgeted: parseFloat(item.budgeted) || 0,
          actual: parseFloat(item.actual) || 0
        }))
      }

      const response = await fetch("/api/expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        const statusText = status === "final" ? "finalized" : "saved as draft"
        toast.success("Expense created successfully", {
          description: `Expense has been ${statusText}.`
        })
        
        // Redirect to view page if final, otherwise to list
        if (status === "final") {
          router.push(`/expense/${data.id}/view`)
        } else {
          router.push("/expense?refresh=true")
        }
      } else {
        const data = await response.json()
        toast.error("Failed to create expense", {
          description: data.error || "An error occurred while creating."
        })
      }
    } catch (error) {
      console.error("Error creating expense:", error)
      toast.error("Failed to create expense")
    } finally {
      setSaving(false)
    }
  }

  const { totalBudget, totalPaid, totalActual, totalDifference, totalItemBudgeted, totalItemDifferences } = calculateTotals()

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader title="Create Expense" showBackButton={true} backTo="/expense" />
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
        <div className="container mx-auto max-w-5xl space-y-6">
          <Breadcrumb items={[
            { label: "Expenses", href: "/expense" },
            { label: "Create" }
          ]} />
          <Card>
            <CardContent className="space-y-6 pt-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                
                <div className="space-y-2">
                  <Label>Project Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={projectName}
                    onChange={(e) => {
                      markInteracted()
                      setProjectName(e.target.value)
                      if (errors.projectName) validateField("projectName", e.target.value)
                    }}
                    onBlur={(e) => validateField("projectName", e.target.value)}
                    placeholder="Enter project name"
                    error={!!errors.projectName}
                  />
                  {errors.projectName && (
                    <p className="text-sm text-destructive">{errors.projectName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Production Date <span className="text-destructive">*</span></Label>
                  <div className="flex gap-2">
                    <Input
                      value={dateInput}
                      onChange={(e) => handleDateInputChange(e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="flex-1"
                      error={!!errors.productionDate}
                    />
                    <div className="shrink-0">
                      <DatePicker
                        date={productionDate || undefined}
                        onDateChange={(date) => {
                          markInteracted()
                          setProductionDate(date || null)
                          if (errors.productionDate) validateField("productionDate", date || null)
                          if (date) {
                            const day = date.getDate().toString().padStart(2, '0')
                            const month = (date.getMonth() + 1).toString().padStart(2, '0')
                            const year = date.getFullYear()
                            setDateInput(`${day}/${month}/${year}`)
                          } else {
                            setDateInput("")
                          }
                        }}
                        placeholder=""
                        error={!!errors.productionDate}
                      />
                    </div>
                  </div>
                  {errors.productionDate && (
                    <p className="text-sm text-destructive">{errors.productionDate}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Type date as DD/MM/YYYY or use the date picker
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Client Budget (Optional)</Label>
                  <CurrencyInput
                    value={clientBudget}
                    onValueChange={(value) => {
                      markInteracted()
                      setClientBudget(value)
                    }}
                    placeholder="Rp 0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter total client budget for the project
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Paid Amount</Label>
                  <CurrencyInput
                    value={paidAmount}
                    onValueChange={(value) => {
                      markInteracted()
                      setPaidAmount(value)
                    }}
                    placeholder="Rp 0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter amount actually paid by client
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => {
                      markInteracted()
                      setNotes(e.target.value)
                    }}
                    placeholder="Enter additional notes"
                    rows={3}
                  />
                </div>
              </div>

              {/* Expense Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Expense Items</h3>
                </div>
                
                {/* Header Row */}
                <div className="grid gap-2 px-4 py-3 mb-1 bg-muted rounded-md lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                  <div className="text-sm font-bold">Product Name</div>
                  <div className="text-sm font-bold">Budgeted</div>
                  <div className="text-sm font-bold">Actual</div>
                  <div className="text-sm font-bold">Difference</div>
                  <div className="w-9"></div>
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  {items.map((item) => (
                    <Card key={item.id} className="bg-muted/50">
                      <CardContent className="py-2">
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                          <div>
                            <Input
                              value={item.productName}
                              onChange={(e) => updateItem(item.id, "productName", e.target.value)}
                              placeholder="Type or select product"
                              list={`products-${item.id}`}
                              className="h-9"
                            />
                            <datalist id={`products-${item.id}`}>
                              {products.map((product) => (
                                <option key={product} value={product} />
                              ))}
                            </datalist>
                          </div>
                          <div>
                            <CurrencyInput
                              value={item.budgeted}
                              onValueChange={(value) => updateItem(item.id, "budgeted", value)}
                              placeholder="Rp 0"
                              className="h-9"
                            />
                          </div>
                          <div>
                            <CurrencyInput
                              value={item.actual}
                              onValueChange={(value) => updateItem(item.id, "actual", value)}
                              placeholder="Rp 0"
                              className="h-9"
                            />
                          </div>
                          <div>
                            <div
                              className={`flex h-9 items-center rounded-md border px-3 text-sm font-medium ${
                                item.difference >= 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {formatCurrency(item.difference)}
                            </div>
                          </div>
                          <div className="flex items-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              disabled={items.length === 1}
                              className="h-9 w-9 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Add Item Button */}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              </div>

              {/* Summary */}
              {items.length > 0 && (
                <div className="space-y-4">
                  {/* Item Totals (For Reference) */}
                  <div className="rounded-lg border-2 border-dashed border-muted bg-muted/20 p-4">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                      Item Totals (For Reference)
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Sum of Item Budgeted:</span>
                        <span className="font-medium">{formatCurrency(totalItemBudgeted)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Sum of Item Differences:</span>
                        <span className={`font-medium ${
                          totalItemDifferences >= 0 ? "text-green-600/70" : "text-red-600/70"
                        }`}>
                          {formatCurrency(totalItemDifferences)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Main Summary */}
                  <div className="rounded-lg border bg-card p-4">
                    <h3 className="text-lg font-semibold mb-3">Summary</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Total Budget:</span>
                        <span className="font-medium">{formatCurrency(totalBudget)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total Paid:</span>
                        <span className="font-medium">{formatCurrency(totalPaid)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total Actual:</span>
                        <span className="font-medium">{formatCurrency(totalActual)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 text-base font-bold">
                        <span>Total Difference:</span>
                        <span
                          className={totalDifference >= 0 ? "text-green-600" : "text-red-600"}
                        >
                          {formatCurrency(totalDifference)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Auto-save status */}
                <AutoSaveIndicator status={autoSaveStatus} />
                <div className="flex flex-wrap gap-3 ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSubmit("draft")}
                    disabled={saving}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save as Draft
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowFinalizeDialog(true)}
                    disabled={saving}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Finalize Expense
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />

      {/* Finalize Confirmation Dialog */}
      <AlertDialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              Once finalized, this expense <strong>cannot be edited anymore</strong>. 
              Make sure all amounts are correct before proceeding. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowFinalizeDialog(false)
                handleSubmit("final")
              }}
              disabled={saving}
            >
              Yes, Finalize
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
