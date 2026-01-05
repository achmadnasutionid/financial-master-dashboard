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
import { Building2, Edit, Trash2, Plus, Loader2, RotateCcw, Archive } from "lucide-react"
import { CardSkeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { toast } from "sonner"

interface Company {
  id: string
  name: string
  address: string
  city: string
  province: string
  postalCode: string | null
  telp: string | null
  email: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDeleted, setShowDeleted] = useState(false)

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    telp: "",
    email: ""
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch companies on mount
  useEffect(() => {
    fetchCompanies(showDeleted)
  }, [showDeleted])

  const fetchCompanies = async (includeDeleted = false) => {
    try {
      setIsLoading(true)
      const url = includeDeleted ? "/api/companies?includeDeleted=true" : "/api/companies"
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setCompanies(data)
      }
    } catch (error) {
      console.error("Error fetching companies:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter companies based on showDeleted toggle
  const filteredCompanies = showDeleted 
    ? companies.filter(c => c.deletedAt !== null)
    : companies.filter(c => c.deletedAt === null)
  
  const sortedCompanies = filteredCompanies

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      errors.name = "Name is required"
    }
    
    if (!formData.address.trim()) {
      errors.address = "Address is required"
    }
    
    if (!formData.city.trim()) {
      errors.city = "City is required"
    }
    
    if (!formData.province.trim()) {
      errors.province = "Province is required"
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreate = async () => {
    if (!validateForm()) return
    
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await fetchCompanies()
        setIsCreateDialogOpen(false)
        resetForm()
        toast.success("Company created", {
          description: `${formData.name} has been added successfully.`
        })
      } else {
        const error = await response.json()
        if (error.error === "Company name already exists") {
          setFormErrors({ name: "Company name already exists" })
          toast.error("Failed to create company", {
            description: "Company name already exists."
          })
        } else {
          setFormErrors({ name: error.error || "Failed to create company" })
          toast.error("Failed to create company", {
            description: error.error || "An error occurred."
          })
        }
      }
    } catch (error) {
      console.error("Error creating company:", error)
      setFormErrors({ name: "Failed to create company" })
      toast.error("Failed to create company", {
        description: "An unexpected error occurred."
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (company: Company) => {
    setSelectedCompany(company)
    setFormData({
      name: company.name,
      address: company.address,
      city: company.city,
      province: company.province,
      postalCode: company.postalCode || "",
      telp: company.telp || "",
      email: company.email || ""
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!validateForm() || !selectedCompany) return
    
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/companies/${selectedCompany.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await fetchCompanies()
        setIsEditDialogOpen(false)
        resetForm()
        toast.success("Company updated", {
          description: `${formData.name} has been updated successfully.`
        })
      } else {
        const error = await response.json()
        if (error.error === "Company name already exists") {
          setFormErrors({ name: "Company name already exists" })
          toast.error("Failed to update company", {
            description: "Company name already exists."
          })
        } else {
          setFormErrors({ name: error.error || "Failed to update company" })
          toast.error("Failed to update company", {
            description: error.error || "An error occurred."
          })
        }
      }
    } catch (error) {
      console.error("Error updating company:", error)
      setFormErrors({ name: "Failed to update company" })
      toast.error("Failed to update company", {
        description: "An unexpected error occurred."
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = (company: Company) => {
    setSelectedCompany(company)
    setIsDeleteDialogOpen(true)
  }

  const [isDeleting, setIsDeleting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

  const handleRestore = async (company: Company) => {
    if (isRestoring) return
    
    const companyName = company.name
    
    // Optimistic update: mark as not deleted
    const previousCompanies = [...companies]
    setCompanies(companies.map(c => 
      c.id === company.id ? { ...c, deletedAt: null } : c
    ))
    
    setIsRestoring(true)
    try {
      const response = await fetch(`/api/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" })
      })

      if (response.ok) {
        toast.success("Company restored", {
          description: `${companyName} has been restored.`
        })
        fetchCompanies(showDeleted)
      } else {
        setCompanies(previousCompanies)
        toast.error("Failed to restore company")
      }
    } catch (error) {
      setCompanies(previousCompanies)
      console.error("Error restoring company:", error)
      toast.error("Failed to restore company")
    } finally {
      setIsRestoring(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedCompany || isDeleting) return
    
    const companyToDelete = selectedCompany
    const companyName = companyToDelete.name
    
    // Optimistic update: remove from UI immediately
    const previousCompanies = [...companies]
    setCompanies(companies.filter(c => c.id !== companyToDelete.id))
    setIsDeleteDialogOpen(false)
    setSelectedCompany(null)
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/companies/${companyToDelete.id}`, {
        method: "DELETE"
      })

      if (response.ok) {
        toast.success("Company deleted", {
          description: `${companyName} has been removed.`
        })
      } else {
        // Revert optimistic update on error
        setCompanies(previousCompanies)
        const error = await response.json()
        toast.error("Failed to delete company", {
          description: error.error || "An error occurred."
        })
      }
    } catch (error) {
      // Revert optimistic update on error
      setCompanies(previousCompanies)
      console.error("Error deleting company:", error)
      toast.error("Failed to delete company", {
        description: "An unexpected error occurred."
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      city: "",
      province: "",
      postalCode: "",
      telp: "",
      email: ""
    })
    setFormErrors({})
    setSelectedCompany(null)
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
      <PageHeader title="Companies" showBackButton backTo="/" />
      
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
        <div className="container mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">
              {showDeleted ? "Deleted Companies" : "Company List"}
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
                  Create Company
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {sortedCompanies.map((company) => (
                <Card key={company.id} className="group flex flex-col transition-all hover:shadow-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{company.name}</CardTitle>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col space-y-3">
                    <div className="flex-1 space-y-1 text-sm">
                      <p className="text-muted-foreground">
                        <span className="font-medium">Address:</span> {company.address}
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-medium">City:</span> {company.city}
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-medium">Province:</span> {company.province}
                      </p>
                      {company.postalCode && company.postalCode.trim() && (
                        <p className="text-muted-foreground">
                          <span className="font-medium">Postal Code:</span> {company.postalCode}
                        </p>
                      )}
                      {company.telp && company.telp.trim() && (
                        <p className="text-muted-foreground">
                          <span className="font-medium">Phone:</span> {company.telp}
                        </p>
                      )}
                      {company.email && company.email.trim() && (
                        <p className="text-muted-foreground">
                          <span className="font-medium">Email:</span> {company.email}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2 pt-4">
                    {showDeleted ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-2 text-green-600 hover:bg-green-600 hover:text-white"
                        onClick={() => handleRestore(company)}
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
                          onClick={() => handleEdit(company)}
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => handleDeleteClick(company)}
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

          {!isLoading && sortedCompanies.length === 0 && (
            showDeleted ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Archive className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No deleted companies</h3>
                <p className="text-muted-foreground mb-4">Deleted companies will appear here.</p>
                <Button variant="outline" onClick={() => setShowDeleted(false)}>
                  Back to Company List
                </Button>
              </div>
            ) : (
              <EmptyState
                type="companies"
                actionLabel="Create Company"
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
            <DialogTitle>Create New Company</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Company name"
              />
              {formErrors.name && (
                <p className="text-sm text-destructive">{formErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address"
              />
              {formErrors.address && (
                <p className="text-sm text-destructive">{formErrors.address}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
              />
              {formErrors.city && (
                <p className="text-sm text-destructive">{formErrors.city}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="province">Province *</Label>
                <Input
                  id="province"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  placeholder="Province"
                />
                {formErrors.province && (
                  <p className="text-sm text-destructive">{formErrors.province}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="Postal code"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="telp">Phone</Label>
              <Input
                id="telp"
                value={formData.telp}
                onChange={(e) => setFormData({ ...formData, telp: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
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
            <DialogTitle>Edit Company</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Company name"
              />
              {formErrors.name && (
                <p className="text-sm text-destructive">{formErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address *</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address"
              />
              {formErrors.address && (
                <p className="text-sm text-destructive">{formErrors.address}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-city">City *</Label>
              <Input
                id="edit-city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
              />
              {formErrors.city && (
                <p className="text-sm text-destructive">{formErrors.city}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-province">Province *</Label>
                <Input
                  id="edit-province"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  placeholder="Province"
                />
                {formErrors.province && (
                  <p className="text-sm text-destructive">{formErrors.province}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-postalCode">Postal Code</Label>
                <Input
                  id="edit-postalCode"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="Postal code"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-telp">Phone</Label>
              <Input
                id="edit-telp"
                value={formData.telp}
                onChange={(e) => setFormData({ ...formData, telp: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
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
              This will permanently delete <strong>{selectedCompany?.name}</strong>.
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

