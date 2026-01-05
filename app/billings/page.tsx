"use client"

import { useState, useEffect, memo, useCallback } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { Footer } from "@/components/layout/footer"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CreditCard, Edit, Trash2, Plus, Loader2, RotateCcw, Archive } from "lucide-react"
import { BillingCardSkeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { toast } from "sonner"

interface Billing {
  id: string
  name: string
  bankName: string
  bankAccount: string
  bankAccountName: string
  ktp: string | null
  npwp: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export default function BillingsPage() {
  const [billings, setBillings] = useState<Billing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDeleted, setShowDeleted] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedBilling, setSelectedBilling] = useState<Billing | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    bankName: "",
    bankAccount: "",
    bankAccountName: "",
    ktp: "",
    npwp: ""
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch billings on mount
  useEffect(() => {
    fetchBillings(showDeleted)
  }, [showDeleted])

  const fetchBillings = async (includeDeleted = false) => {
    try {
      setIsLoading(true)
      const url = includeDeleted ? "/api/billings?includeDeleted=true" : "/api/billings"
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setBillings(data)
      }
    } catch (error) {
      console.error("Error fetching billings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter billings based on showDeleted toggle
  const filteredBillings = showDeleted 
    ? billings.filter(b => b.deletedAt !== null)
    : billings.filter(b => b.deletedAt === null)
  
  const sortedBillings = filteredBillings

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      errors.name = "Name is required"
    }
    
    if (!formData.bankName.trim()) {
      errors.bankName = "Bank name is required"
    }
    
    if (!formData.bankAccount.trim()) {
      errors.bankAccount = "Bank account is required"
    }
    
    if (!formData.bankAccountName.trim()) {
      errors.bankAccountName = "Bank account name is required"
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreate = async () => {
    if (!validateForm()) return
    
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/billings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        await fetchBillings()
        setIsCreateDialogOpen(false)
        toast.success("Billing created", {
          description: `${formData.name} has been added successfully.`
        })
        resetForm()
      } else {
        console.error("API Error:", data)
        if (data.error === "Billing name already exists") {
          setFormErrors({ name: "Billing name already exists" })
          toast.error("Failed to create billing", {
            description: "Billing name already exists."
          })
        } else {
          setFormErrors({ name: data.error || "Failed to create billing" })
          toast.error("Failed to create billing", {
            description: data.error || "An error occurred."
          })
        }
      }
    } catch (error) {
      console.error("Network error creating billing:", error)
      setFormErrors({ name: "Network error. Please try again." })
      toast.error("Failed to create billing", {
        description: "Network error. Please try again."
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (billing: Billing) => {
    setSelectedBilling(billing)
    setFormData({
      name: billing.name,
      bankName: billing.bankName,
      bankAccount: billing.bankAccount,
      bankAccountName: billing.bankAccountName,
      ktp: billing.ktp || "",
      npwp: billing.npwp || ""
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!validateForm() || !selectedBilling) return
    
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/billings/${selectedBilling.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await fetchBillings()
        setIsEditDialogOpen(false)
        toast.success("Billing updated", {
          description: `${formData.name} has been updated successfully.`
        })
        resetForm()
      } else {
        const error = await response.json()
        if (error.error === "Billing name already exists") {
          setFormErrors({ name: "Billing name already exists" })
          toast.error("Failed to update billing", {
            description: "Billing name already exists."
          })
        } else {
          setFormErrors({ name: error.error || "Failed to update billing" })
          toast.error("Failed to update billing", {
            description: error.error || "An error occurred."
          })
        }
      }
    } catch (error) {
      console.error("Error updating billing:", error)
      setFormErrors({ name: "Failed to update billing" })
      toast.error("Failed to update billing", {
        description: "An unexpected error occurred."
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = (billing: Billing) => {
    setSelectedBilling(billing)
    setIsDeleteDialogOpen(true)
  }

  const [isDeleting, setIsDeleting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

  const handleRestore = async (billing: Billing) => {
    if (isRestoring) return
    
    const billingName = billing.name
    const previousBillings = [...billings]
    setBillings(billings.map(b => 
      b.id === billing.id ? { ...b, deletedAt: null } : b
    ))
    
    setIsRestoring(true)
    try {
      const response = await fetch(`/api/billings/${billing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" })
      })

      if (response.ok) {
        toast.success("Billing restored", {
          description: `${billingName} has been restored.`
        })
        fetchBillings(showDeleted)
      } else {
        setBillings(previousBillings)
        toast.error("Failed to restore billing")
      }
    } catch (error) {
      setBillings(previousBillings)
      console.error("Error restoring billing:", error)
      toast.error("Failed to restore billing")
    } finally {
      setIsRestoring(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedBilling || isDeleting) return
    
    const billingToDelete = selectedBilling
    const billingName = billingToDelete.name
    
    // Optimistic update: remove from UI immediately
    const previousBillings = [...billings]
    setBillings(billings.filter(b => b.id !== billingToDelete.id))
    setIsDeleteDialogOpen(false)
    setSelectedBilling(null)
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/billings/${billingToDelete.id}`, {
        method: "DELETE"
      })

      if (response.ok) {
        toast.success("Billing deleted", {
          description: `${billingName} has been removed.`
        })
      } else {
        // Revert optimistic update on error
        setBillings(previousBillings)
        const errorData = await response.json()
        console.error("Delete failed:", errorData)
        toast.error("Failed to delete billing", {
          description: errorData.error || "An error occurred."
        })
      }
    } catch (error) {
      // Revert optimistic update on error
      setBillings(previousBillings)
      console.error("Error deleting billing:", error)
      toast.error("Failed to delete billing", {
        description: "An unexpected error occurred."
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      bankName: "",
      bankAccount: "",
      bankAccountName: "",
      ktp: "",
      npwp: ""
    })
    setFormErrors({})
    setSelectedBilling(null)
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    setIsCreateDialogOpen(open)
  }

  const handleEditDialogClose = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    setIsEditDialogOpen(open)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader title="Billings" showBackButton backTo="/" />
      
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
        <div className="container mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">
              {showDeleted ? "Deleted Billings" : "Billing List"}
            </h2>
            <div className="flex gap-2">
              <Button 
                variant={showDeleted ? "default" : "outline"} 
                onClick={() => setShowDeleted(!showDeleted)}
                className="gap-2"
              >
                <Archive className="h-4 w-4" />
                {showDeleted ? "Show Active" : "Show Deleted"}
              </Button>
              {!showDeleted && (
                <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Billing
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <BillingCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {sortedBillings.map((billing) => (
                <Card key={billing.id} className="group flex flex-col transition-all hover:shadow-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <CreditCard className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{billing.name}</CardTitle>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col space-y-3">
                    <div className="flex-1 space-y-1 text-sm">
                      <p className="text-muted-foreground">
                        <span className="font-medium">Bank:</span> {billing.bankName}
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-medium">Account:</span> {billing.bankAccount}
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-medium">Account Name:</span> {billing.bankAccountName}
                      </p>
                      {billing.ktp && billing.ktp.trim() && (
                        <p className="text-muted-foreground">
                          <span className="font-medium">KTP:</span> {billing.ktp}
                        </p>
                      )}
                      {billing.npwp && billing.npwp.trim() && (
                        <p className="text-muted-foreground">
                          <span className="font-medium">NPWP:</span> {billing.npwp}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2 pt-4">
                      {showDeleted ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-2 text-green-600 hover:bg-green-600 hover:text-white"
                          onClick={() => handleRestore(billing)}
                          disabled={isRestoring}
                        >
                          <RotateCcw className="h-4 w-4" />
                          {isRestoring ? "Restoring..." : "Restore"}
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-2"
                            onClick={() => handleEdit(billing)}
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleDeleteClick(billing)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isLoading && sortedBillings.length === 0 && (
            showDeleted ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Archive className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No deleted billings</h3>
                <p className="text-muted-foreground mb-4">Deleted billings will appear here.</p>
                <Button variant="outline" onClick={() => setShowDeleted(false)}>
                  Back to Billing List
                </Button>
              </div>
            ) : (
              <EmptyState
                type="billings"
                actionLabel="Create Billing"
                onAction={() => setIsCreateDialogOpen(true)}
              />
            )
          )}
        </div>
      </main>
      
      <Footer />

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Billing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Billing Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Billing name"
              />
              {formErrors.name && (
                <p className="text-sm text-destructive">{formErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name *</Label>
              <Input
                id="bankName"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                placeholder="Bank name"
              />
              {formErrors.bankName && (
                <p className="text-sm text-destructive">{formErrors.bankName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccount">Bank Account *</Label>
              <Input
                id="bankAccount"
                value={formData.bankAccount}
                onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                placeholder="Account number"
              />
              {formErrors.bankAccount && (
                <p className="text-sm text-destructive">{formErrors.bankAccount}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccountName">Bank Account Name *</Label>
              <Input
                id="bankAccountName"
                value={formData.bankAccountName}
                onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                placeholder="Account holder name"
              />
              {formErrors.bankAccountName && (
                <p className="text-sm text-destructive">{formErrors.bankAccountName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ktp">KTP</Label>
              <Input
                id="ktp"
                value={formData.ktp}
                onChange={(e) => setFormData({ ...formData, ktp: e.target.value })}
                placeholder="KTP number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="npwp">NPWP</Label>
              <Input
                id="npwp"
                value={formData.npwp}
                onChange={(e) => setFormData({ ...formData, npwp: e.target.value })}
                placeholder="NPWP number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogClose(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Billing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Billing Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Billing name"
              />
              {formErrors.name && (
                <p className="text-sm text-destructive">{formErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-bankName">Bank Name *</Label>
              <Input
                id="edit-bankName"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                placeholder="Bank name"
              />
              {formErrors.bankName && (
                <p className="text-sm text-destructive">{formErrors.bankName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-bankAccount">Bank Account *</Label>
              <Input
                id="edit-bankAccount"
                value={formData.bankAccount}
                onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                placeholder="Account number"
              />
              {formErrors.bankAccount && (
                <p className="text-sm text-destructive">{formErrors.bankAccount}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-bankAccountName">Bank Account Name *</Label>
              <Input
                id="edit-bankAccountName"
                value={formData.bankAccountName}
                onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                placeholder="Account holder name"
              />
              {formErrors.bankAccountName && (
                <p className="text-sm text-destructive">{formErrors.bankAccountName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ktp">KTP</Label>
              <Input
                id="edit-ktp"
                value={formData.ktp}
                onChange={(e) => setFormData({ ...formData, ktp: e.target.value })}
                placeholder="KTP number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-npwp">NPWP</Label>
              <Input
                id="edit-npwp"
                value={formData.npwp}
                onChange={(e) => setFormData({ ...formData, npwp: e.target.value })}
                placeholder="NPWP number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleEditDialogClose(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => !isDeleting && setIsDeleteDialogOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{selectedBilling?.name}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
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
    </div>
  )
}

