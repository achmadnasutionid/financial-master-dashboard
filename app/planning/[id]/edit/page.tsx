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
import { Plus, Trash2, Save, CheckCircle } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { toast } from "sonner"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { AutoSaveIndicator, AutoSaveStatus } from "@/components/ui/auto-save-indicator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

interface PlanningItem {
  id: string
  productName: string
  budget: string
  expense: string
}

export default function EditPlanningPage() {
  const router = useRouter()
  const params = useParams()
  const planningId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [projectName, setProjectName] = useState("")
  const [clientName, setClientName] = useState("")
  const [clientBudget, setClientBudget] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<PlanningItem[]>([])
  const [products, setProducts] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<any>({})
  const [hasInteracted, setHasInteracted] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle")
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [planningNumber, setPlanningNumber] = useState<string>("")
  const [planningStatus, setPlanningStatus] = useState<string>("")
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false)

  // Fetch planning data
  useEffect(() => {
    if (!planningId) return

    fetch(`/api/planning/${planningId}`)
      .then((res) => res.json())
      .then((data) => {
        // Check if planning is finalized
        if (data.status === "final") {
          toast.error("Cannot edit finalized planning", {
            description: "This planning has been finalized and cannot be edited."
          })
          router.push("/planning?refresh=true")
          return
        }

        setPlanningNumber(data.planningId)
        setPlanningStatus(data.status)
        setProjectName(data.projectName)
        setClientName(data.clientName)
        setClientBudget(data.clientBudget.toString())
        setNotes(data.notes || "")
        setItems(
          data.items.map((item: any) => ({
            id: item.id,
            productName: item.productName,
            budget: item.budget.toString(),
            expense: item.expense.toString(),
          }))
        )
        setLoading(false)
      })
      .catch((error) => {
        console.error("Error fetching planning:", error)
        toast.error("Failed to load planning", {
          description: "An error occurred while loading the planning."
        })
        setLoading(false)
      })
  }, [planningId, router])

  // Fetch products for dropdown
  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data.map((p: any) => p.name)))
      .catch(console.error)
  }, [])

  // Mark as interacted on first change
  const markInteracted = () => {
    if (!hasInteracted) {
      setHasInteracted(true)
    }
  }

  // Auto-save function
  const autoSave = async () => {
    if (!hasInteracted || !projectName || !clientName || !clientBudget) {
      return
    }

    try {
      setAutoSaveStatus("saving")
      
      const payload = {
        projectName,
        clientName,
        clientBudget: parseFloat(clientBudget) || 0,
        notes,
        items: items.map((item) => ({
          productName: item.productName,
          budget: parseFloat(item.budget) || 0,
          expense: parseFloat(item.expense) || 0,
        })),
        status: "draft",
      }

      const response = await fetch(`/api/planning/${planningId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        setAutoSaveStatus("saved")
        setTimeout(() => setAutoSaveStatus("idle"), 3000)
      }
    } catch (error) {
      console.error("Auto-save error:", error)
      setAutoSaveStatus("error")
    }
  }

  // Set up auto-save timer
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
  }, [projectName, clientName, clientBudget, notes, items, hasInteracted])

  const addItem = () => {
    markInteracted()
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        productName: "",
        budget: "",
        expense: "",
      },
    ])
  }

  const removeItem = (id: string) => {
    markInteracted()
    setItems(items.filter((item) => item.id !== id))
  }

  const updateItem = (id: string, field: string, value: string) => {
    markInteracted()
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    )
  }

  const calculateItemProfit = (budget: string, expense: string) => {
    const b = parseFloat(budget) || 0
    const e = parseFloat(expense) || 0
    return b - e
  }

  const calculateTotals = () => {
    const totalBudget = items.reduce(
      (sum, item) => sum + (parseFloat(item.budget) || 0),
      0
    )
    const totalExpense = items.reduce(
      (sum, item) => sum + (parseFloat(item.expense) || 0),
      0
    )
    const totalProfit = totalBudget - totalExpense
    const margin = totalBudget > 0 ? (totalProfit / totalBudget) * 100 : 0
    return { totalBudget, totalExpense, totalProfit, margin }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const validateField = (field: string, value: string) => {
    const fieldErrors: any = { ...errors }
    
    switch (field) {
      case "projectName":
        if (!value.trim()) {
          fieldErrors.projectName = "Project name is required"
        } else {
          delete fieldErrors.projectName
        }
        break
      case "clientName":
        if (!value.trim()) {
          fieldErrors.clientName = "Client name is required"
        } else {
          delete fieldErrors.clientName
        }
        break
      case "clientBudget":
        if (!value || parseFloat(value) <= 0) {
          fieldErrors.clientBudget = "Valid client budget is required"
        } else {
          delete fieldErrors.clientBudget
        }
        break
    }
    
    setErrors(fieldErrors)
  }

  const validateForm = () => {
    const newErrors: any = {}
    if (!projectName.trim()) newErrors.projectName = "Project name is required"
    if (!clientName.trim()) newErrors.clientName = "Client name is required"
    if (!clientBudget || parseFloat(clientBudget) <= 0)
      newErrors.clientBudget = "Valid client budget is required"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (status: "draft" | "final") => {
    if (saving) return
    if (!validateForm()) return

    // Additional validation for finalizing
    if (status === "final") {
      // Check if there are any items
      if (items.length === 0) {
        toast.warning("Cannot finalize planning", {
          description: "Please add at least one item before finalizing."
        })
        return
      }

      // Check if all items have product names
      const emptyProducts = items.filter(item => !item.productName.trim())
      if (emptyProducts.length > 0) {
        toast.warning("Cannot finalize planning", {
          description: "All items must have a product name filled in."
        })
        return
      }

      // Check if total budget equals client budget
      const { totalBudget } = calculateTotals()
      const clientBudgetValue = parseFloat(clientBudget)
      if (Math.abs(totalBudget - clientBudgetValue) > 0.01) {
        toast.warning("Cannot finalize planning", {
          description: `Total budget (${formatCurrency(totalBudget)}) must equal client budget (${formatCurrency(clientBudgetValue)}).`
        })
        return
      }
    }

    setSaving(true)
    try {
      const payload = {
        projectName,
        clientName,
        clientBudget: parseFloat(clientBudget),
        notes,
        items: items.map((item) => ({
          productName: item.productName,
          budget: parseFloat(item.budget) || 0,
          expense: parseFloat(item.expense) || 0,
        })),
        status,
      }

      const response = await fetch(`/api/planning/${planningId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success("Planning updated successfully", {
          description: `Planning has been ${status === "final" ? "finalized" : "saved as draft"}.`
        })
        
        // Redirect to view page if finalized, otherwise go to list
        if (status === "final") {
          router.push(`/planning/${planningId}/view`)
        } else {
          router.push("/planning?refresh=true")
        }
      } else {
        const data = await response.json()
        toast.error("Failed to update planning", {
          description: data.error || "An error occurred while updating."
        })
      }
    } catch (error) {
      console.error("Error updating planning:", error)
      toast.error("Failed to update planning", {
        description: "An unexpected error occurred."
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <PageHeader title="Edit Planning" showBackButton={true} backTo="/planning" />
        <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
          <div className="container mx-auto max-w-5xl space-y-6">
            <div className="flex justify-between items-center">
              <div className="h-8 w-48 animate-pulse rounded bg-muted" />
              <div className="flex gap-2">
                <div className="h-10 w-32 animate-pulse rounded bg-muted" />
                <div className="h-10 w-32 animate-pulse rounded bg-muted" />
              </div>
            </div>
            {[1, 2].map((section) => (
              <div key={section} className="rounded-lg border bg-card p-6 space-y-4">
                <div className="h-6 w-40 animate-pulse rounded bg-muted" />
                <div className="grid gap-4 md:grid-cols-2">
                  {[1, 2, 3, 4].map((field) => (
                    <div key={field} className="space-y-2">
                      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                      <div className="h-10 w-full animate-pulse rounded bg-muted" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const totals = calculateTotals()

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader title="Edit Planning" showBackButton={true} backTo="/planning" />
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
        <div className="container mx-auto max-w-5xl space-y-6">
          <Breadcrumb items={[
            { label: "Planning", href: "/planning" },
            { label: planningNumber || "Edit" }
          ]} />
          <Card>
            <CardContent className="space-y-6 pt-6">
              {/* Project Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Project Information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="projectName">
                      Project Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="projectName"
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
                    <Label htmlFor="clientName">
                      Client Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="clientName"
                      value={clientName}
                      onChange={(e) => {
                        markInteracted()
                        setClientName(e.target.value)
                        if (errors.clientName) validateField("clientName", e.target.value)
                      }}
                      onBlur={(e) => validateField("clientName", e.target.value)}
                      placeholder="Enter client name"
                      error={!!errors.clientName}
                    />
                    {errors.clientName && (
                      <p className="text-sm text-destructive">{errors.clientName}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientBudget">
                    Client Budget <span className="text-destructive">*</span>
                  </Label>
                  <CurrencyInput
                    id="clientBudget"
                    value={clientBudget}
                    onValueChange={(value) => {
                      markInteracted()
                      setClientBudget(value)
                    }}
                    placeholder="Enter client budget"
                  />
                  {errors.clientBudget && (
                    <p className="text-sm text-destructive">{errors.clientBudget}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
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

              {/* Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Items</h3>
                  <Button type="button" onClick={addItem} variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>

                {items.length === 0 ? (
                  <div className="rounded-md bg-muted p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No items added yet. Click "Add Item" to start.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Header Row */}
                    <div className="grid gap-2 px-4 py-3 mb-1 bg-muted rounded-md lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                      <div className="text-sm font-bold">Product Name</div>
                      <div className="text-sm font-bold">Budget</div>
                      <div className="text-sm font-bold">Expense</div>
                      <div className="text-sm font-bold">Profit</div>
                      <div className="w-9"></div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-2">
                      {items.map((item, index) => {
                        const profit = calculateItemProfit(item.budget, item.expense)
                        return (
                          <Card key={item.id} className="bg-muted/50">
                            <CardContent className="py-2">
                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                                <div>
                                  <Input
                                    value={item.productName}
                                    onChange={(e) =>
                                      updateItem(item.id, "productName", e.target.value)
                                    }
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
                                    value={item.budget}
                                    onValueChange={(value) =>
                                      updateItem(item.id, "budget", value)
                                    }
                                    placeholder="Rp 0"
                                    className="h-9"
                                  />
                                </div>
                                <div>
                                  <CurrencyInput
                                    value={item.expense}
                                    onValueChange={(value) =>
                                      updateItem(item.id, "expense", value)
                                    }
                                    placeholder="Rp 0"
                                    className="h-9"
                                  />
                                </div>
                                <div>
                                  <div
                                    className={`flex h-9 items-center rounded-md border px-3 text-sm font-medium ${
                                      profit >= 0 ? "text-green-600" : "text-red-600"
                                    }`}
                                  >
                                    {formatCurrency(profit)}
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeItem(item.id)}
                                    className="h-9 w-9 p-0"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Summary */}
              {items.length > 0 && (
                <div className="space-y-4 rounded-lg border bg-card p-4">
                  <h3 className="text-lg font-semibold">Summary</h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Budget</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(totals.totalBudget)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Expense</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(totals.totalExpense)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Profit</p>
                      <p
                        className={`text-lg font-bold ${
                          totals.totalProfit >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatCurrency(totals.totalProfit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Margin</p>
                      <p
                        className={`text-lg font-bold ${
                          totals.margin >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {totals.margin.toFixed(2)}%
                      </p>
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
                    Finalize Planning
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
            <AlertDialogTitle>Finalize Planning?</AlertDialogTitle>
            <AlertDialogDescription>
              Once finalized, this planning <strong>cannot be edited anymore</strong>. 
              A quotation will be generated from this planning. Are you sure you want to continue?
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

