"use client"

import { useState, useEffect, memo, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { Footer } from "@/components/layout/footer"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Package, Edit, Trash2, Plus, Loader2, RotateCcw, Archive } from "lucide-react"
import { SimpleCardSkeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { toast } from "sonner"

interface Product {
  id: string
  name: string
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export default function ProductsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDeleted, setShowDeleted] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: ""
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch products on mount and when showDeleted changes
  useEffect(() => {
    fetchProducts(showDeleted)
  }, [showDeleted])

  // Check for auto-fill from sessionStorage
  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'create') {
      const productName = sessionStorage.getItem('newProductName')
      if (productName) {
        setFormData({ name: productName })
        setIsCreateDialogOpen(true)
        // Clear sessionStorage after using it
        sessionStorage.removeItem('newProductName')
      }
    }
  }, [searchParams])

  const fetchProducts = async (includeDeleted = false) => {
    try {
      setIsLoading(true)
      const url = includeDeleted ? "/api/products?includeDeleted=true" : "/api/products"
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter products based on showDeleted toggle
  const filteredProducts = showDeleted 
    ? products.filter(p => p.deletedAt !== null)
    : products.filter(p => p.deletedAt === null)
  
  const sortedProducts = filteredProducts

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      errors.name = "Product name is required"
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreate = async () => {
    if (!validateForm()) return
    
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        await fetchProducts()
        setIsCreateDialogOpen(false)
        toast.success("Product created", {
          description: `${formData.name} has been added successfully.`
        })
        resetForm()
        // If coming from landing page ETC card, redirect back
        const fromLanding = sessionStorage.getItem('fromLanding')
        if (fromLanding === 'true') {
          sessionStorage.removeItem('fromLanding')
          router.push('/')
        }
      } else {
        console.error("API Error:", data)
        if (data.error === "Product name already exists") {
          setFormErrors({ name: "Product name already exists" })
          toast.error("Failed to create product", {
            description: "Product name already exists."
          })
        } else {
          setFormErrors({ name: data.error || "Failed to create product" })
          toast.error("Failed to create product", {
            description: data.error || "An error occurred."
          })
        }
      }
    } catch (error) {
      console.error("Network error creating product:", error)
      setFormErrors({ name: "Network error. Please try again." })
      toast.error("Failed to create product", {
        description: "Network error. Please try again."
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (product: Product) => {
    setSelectedProduct(product)
    setFormData({
      name: product.name
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!validateForm() || !selectedProduct) return
    
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/products/${selectedProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await fetchProducts()
        setIsEditDialogOpen(false)
        toast.success("Product updated", {
          description: `${formData.name} has been updated successfully.`
        })
        resetForm()
      } else {
        const error = await response.json()
        if (error.error === "Product name already exists") {
          setFormErrors({ name: "Product name already exists" })
          toast.error("Failed to update product", {
            description: "Product name already exists."
          })
        } else {
          setFormErrors({ name: error.error || "Failed to update product" })
          toast.error("Failed to update product", {
            description: error.error || "An error occurred."
          })
        }
      }
    } catch (error) {
      console.error("Error updating product:", error)
      setFormErrors({ name: "Failed to update product" })
      toast.error("Failed to update product", {
        description: "An unexpected error occurred."
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = (product: Product) => {
    setSelectedProduct(product)
    setIsDeleteDialogOpen(true)
  }

  const [isDeleting, setIsDeleting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

  const handleRestore = async (product: Product) => {
    if (isRestoring) return
    
    const productName = product.name
    const previousProducts = [...products]
    setProducts(products.map(p => 
      p.id === product.id ? { ...p, deletedAt: null } : p
    ))
    
    setIsRestoring(true)
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" })
      })

      if (response.ok) {
        toast.success("Product restored", {
          description: `${productName} has been restored.`
        })
        fetchProducts(showDeleted)
      } else {
        setProducts(previousProducts)
        toast.error("Failed to restore product")
      }
    } catch (error) {
      setProducts(previousProducts)
      console.error("Error restoring product:", error)
      toast.error("Failed to restore product")
    } finally {
      setIsRestoring(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedProduct || isDeleting) return
    
    const productToDelete = selectedProduct
    const productName = productToDelete.name
    
    // Optimistic update: remove from UI immediately
    const previousProducts = [...products]
    setProducts(products.filter(p => p.id !== productToDelete.id))
    setIsDeleteDialogOpen(false)
    setSelectedProduct(null)
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/products/${productToDelete.id}`, {
        method: "DELETE"
      })

      if (response.ok) {
        toast.success("Product deleted", {
          description: `${productName} has been removed.`
        })
      } else {
        // Revert optimistic update on error
        setProducts(previousProducts)
        const errorData = await response.json()
        console.error("Delete failed:", errorData)
        toast.error("Failed to delete product", {
          description: errorData.error || "An error occurred."
        })
      }
    } catch (error) {
      // Revert optimistic update on error
      setProducts(previousProducts)
      console.error("Error deleting product:", error)
      toast.error("Failed to delete product", {
        description: "An unexpected error occurred."
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: ""
    })
    setFormErrors({})
    setSelectedProduct(null)
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
      <PageHeader title="Products" showBackButton backTo="/" />
      
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
        <div className="container mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">
              {showDeleted ? "Deleted Products" : "Product List"}
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
                  Create Product
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <SimpleCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {sortedProducts.map((product) => (
                <Card key={product.id} className="group flex flex-col transition-all hover:shadow-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <Package className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg leading-tight">{product.name}</CardTitle>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <div className="flex-1"></div>
                    
                    <div className="flex gap-2 pt-4">
                      {showDeleted ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-2 text-green-600 hover:bg-green-600 hover:text-white"
                          onClick={() => handleRestore(product)}
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
                            onClick={() => handleEdit(product)}
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleDeleteClick(product)}
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

          {!isLoading && sortedProducts.length === 0 && (
            showDeleted ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Archive className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No deleted products</h3>
                <p className="text-muted-foreground mb-4">Deleted products will appear here.</p>
                <Button variant="outline" onClick={() => setShowDeleted(false)}>
                  Back to Product List
                </Button>
              </div>
            ) : (
              <EmptyState
                type="products"
                actionLabel="Create Product"
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
            <DialogTitle>Create New Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., PHOTOGRAPHER"
              />
              {formErrors.name && (
                <p className="text-sm text-destructive">{formErrors.name}</p>
              )}
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
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Product Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., PHOTOGRAPHER"
              />
              {formErrors.name && (
                <p className="text-sm text-destructive">{formErrors.name}</p>
              )}
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
              This will permanently delete <strong>{selectedProduct?.name}</strong>.
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

