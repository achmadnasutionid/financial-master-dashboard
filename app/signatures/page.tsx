"use client"

import { useState, useEffect, useRef, memo, useCallback } from "react"
import SignatureCanvas from "react-signature-canvas"
import { PageHeader } from "@/components/layout/page-header"
import { Footer } from "@/components/layout/footer"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileSignature, Edit, Trash2, Plus, Loader2, RotateCcw, Archive } from "lucide-react"
import { SignatureCardSkeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { toast } from "sonner"

interface Signature {
  id: string
  name: string
  role?: string
  imageData: string
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export default function SignaturesPage() {
  const [signatures, setSignatures] = useState<Signature[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDeleted, setShowDeleted] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedSignature, setSelectedSignature] = useState<Signature | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    role: ""
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const signatureRef = useRef<SignatureCanvas>(null)

  // Fetch signatures on mount and when showDeleted changes
  useEffect(() => {
    fetchSignatures(showDeleted)
  }, [showDeleted])

  const fetchSignatures = async (includeDeleted = false) => {
    try {
      setIsLoading(true)
      const url = includeDeleted ? "/api/signatures?includeDeleted=true" : "/api/signatures"
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setSignatures(data)
      }
    } catch (error) {
      console.error("Error fetching signatures:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter signatures based on showDeleted toggle
  const filteredSignatures = showDeleted 
    ? signatures.filter(s => s.deletedAt !== null)
    : signatures.filter(s => s.deletedAt === null)
  
  const sortedSignatures = filteredSignatures

  const trimCanvas = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return canvas

    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const { data, width, height } = pixels
    
    let top = height, bottom = 0, left = width, right = 0
    
    // Find bounds of non-transparent pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3]
        if (alpha > 0) {
          if (y < top) top = y
          if (y > bottom) bottom = y
          if (x < left) left = x
          if (x > right) right = x
        }
      }
    }
    
    // Add minimal padding
    const padding = 2
    top = Math.max(0, top - padding)
    bottom = Math.min(height - 1, bottom + padding)
    left = Math.max(0, left - padding)
    right = Math.min(width - 1, right + padding)
    
    const trimmedWidth = right - left + 1
    const trimmedHeight = bottom - top + 1
    
    // Create new canvas with trimmed size
    const trimmedCanvas = document.createElement('canvas')
    trimmedCanvas.width = trimmedWidth
    trimmedCanvas.height = trimmedHeight
    
    const trimmedCtx = trimmedCanvas.getContext('2d')
    if (trimmedCtx) {
      trimmedCtx.drawImage(
        canvas,
        left, top, trimmedWidth, trimmedHeight,
        0, 0, trimmedWidth, trimmedHeight
      )
    }
    
    return trimmedCanvas
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      errors.name = "Name is required"
    }
    
    if (signatureRef.current?.isEmpty()) {
      errors.signature = "Signature is required"
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreate = async () => {
    if (!validateForm()) return
    
    const canvas = signatureRef.current?.getCanvas()
    if (!canvas) {
      setFormErrors({ signature: "Failed to capture signature" })
      return
    }
    
    const trimmedCanvas = trimCanvas(canvas)
    const imageData = trimmedCanvas.toDataURL()
    
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/signatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role || null,
          imageData
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error("API Error Response:", errorText)
        
        try {
          const data = JSON.parse(errorText)
          if (data.error === "Signature name already exists") {
            setFormErrors({ name: "Signature name already exists" })
            toast.error("Failed to create signature", {
              description: "Signature name already exists."
            })
          } else {
            setFormErrors({ name: data.error || "Failed to create signature" })
            toast.error("Failed to create signature", {
              description: data.error || "An error occurred."
            })
          }
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError)
          setFormErrors({ name: `Server error: ${errorText.substring(0, 100)}` })
          toast.error("Failed to create signature", {
            description: "Server error occurred."
          })
        }
        return
      }

      const data = await response.json()
      
      await fetchSignatures()
      setIsCreateDialogOpen(false)
      toast.success("Signature created", {
        description: `${formData.name} has been added successfully.`
      })
      resetForm()
    } catch (error) {
      console.error("Network error creating signature:", error)
      setFormErrors({ name: `Network error: ${error instanceof Error ? error.message : String(error)}` })
      toast.error("Failed to create signature", {
        description: "Network error. Please try again."
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (signature: Signature) => {
    setSelectedSignature(signature)
    setFormData({
      name: signature.name,
      role: signature.role || ""
    })
    setIsEditDialogOpen(true)
    // Load signature image into canvas after dialog opens
    setTimeout(() => {
      if (signatureRef.current) {
        signatureRef.current.fromDataURL(signature.imageData)
      }
    }, 100)
  }

  const handleUpdate = async () => {
    if (!validateForm() || !selectedSignature) return
    
    const canvas = signatureRef.current?.getCanvas()
    if (!canvas) {
      setFormErrors({ signature: "Failed to capture signature" })
      return
    }
    
    const trimmedCanvas = trimCanvas(canvas)
    const imageData = trimmedCanvas.toDataURL()
    
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/signatures/${selectedSignature.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role || null,
          imageData
        })
      })

      if (response.ok) {
        await fetchSignatures()
        setIsEditDialogOpen(false)
        toast.success("Signature updated", {
          description: `${formData.name} has been updated successfully.`
        })
        resetForm()
      } else {
        const error = await response.json()
        if (error.error === "Signature name already exists") {
          setFormErrors({ name: "Signature name already exists" })
          toast.error("Failed to update signature", {
            description: "Signature name already exists."
          })
        } else {
          setFormErrors({ name: error.error || "Failed to update signature" })
          toast.error("Failed to update signature", {
            description: error.error || "An error occurred."
          })
        }
      }
    } catch (error) {
      console.error("Error updating signature:", error)
      setFormErrors({ name: "Failed to update signature" })
      toast.error("Failed to update signature", {
        description: "An unexpected error occurred."
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = (signature: Signature) => {
    setSelectedSignature(signature)
    setIsDeleteDialogOpen(true)
  }

  const [isDeleting, setIsDeleting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

  const handleRestore = async (signature: Signature) => {
    if (isRestoring) return
    
    const signatureName = signature.name
    const previousSignatures = [...signatures]
    setSignatures(signatures.map(s => 
      s.id === signature.id ? { ...s, deletedAt: null } : s
    ))
    
    setIsRestoring(true)
    try {
      const response = await fetch(`/api/signatures/${signature.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" })
      })

      if (response.ok) {
        toast.success("Signature restored", {
          description: `${signatureName} has been restored.`
        })
        fetchSignatures(showDeleted)
      } else {
        setSignatures(previousSignatures)
        toast.error("Failed to restore signature")
      }
    } catch (error) {
      setSignatures(previousSignatures)
      console.error("Error restoring signature:", error)
      toast.error("Failed to restore signature")
    } finally {
      setIsRestoring(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedSignature || isDeleting) return
    
    const signatureToDelete = selectedSignature
    const signatureName = signatureToDelete.name
    
    // Optimistic update: remove from UI immediately
    const previousSignatures = [...signatures]
    setSignatures(signatures.filter(s => s.id !== signatureToDelete.id))
    setIsDeleteDialogOpen(false)
    setSelectedSignature(null)
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/signatures/${signatureToDelete.id}`, {
        method: "DELETE"
      })

      if (response.ok) {
        toast.success("Signature deleted", {
          description: `${signatureName} has been removed.`
        })
      } else {
        // Revert optimistic update on error
        setSignatures(previousSignatures)
        const errorData = await response.json()
        console.error("Delete failed:", errorData)
        toast.error("Failed to delete signature", {
          description: errorData.error || "An error occurred."
        })
      }
    } catch (error) {
      // Revert optimistic update on error
      setSignatures(previousSignatures)
      console.error("Error deleting signature:", error)
      toast.error("Failed to delete signature", {
        description: "An unexpected error occurred."
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      role: ""
    })
    setFormErrors({})
    setSelectedSignature(null)
    if (signatureRef.current) {
      signatureRef.current.clear()
    }
  }

  const handleClearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear()
    }
    const { signature, ...rest } = formErrors
    setFormErrors(rest)
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
      <PageHeader title="Signatures" showBackButton backTo="/" />
      
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
        <div className="container mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">
              {showDeleted ? "Deleted Signatures" : "Signature List"}
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
                  Create Signature
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SignatureCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {sortedSignatures.map((signature) => (
                <Card key={signature.id} className="group flex flex-col transition-all hover:shadow-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <FileSignature className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{signature.name}</CardTitle>
                          {signature.role && (
                            <p className="text-sm text-muted-foreground mt-1">{signature.role}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col space-y-3">
                    <div className="flex-1">
                      <div className="rounded-lg border border-border bg-background p-4">
                        <img 
                          src={signature.imageData} 
                          alt={signature.name}
                          className="mx-auto h-24 w-full object-contain"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-4">
                      {showDeleted ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-2 text-green-600 hover:bg-green-600 hover:text-white"
                          onClick={() => handleRestore(signature)}
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
                            onClick={() => handleEdit(signature)}
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleDeleteClick(signature)}
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

          {!isLoading && sortedSignatures.length === 0 && (
            showDeleted ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Archive className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No deleted signatures</h3>
                <p className="text-muted-foreground mb-4">Deleted signatures will appear here.</p>
                <Button variant="outline" onClick={() => setShowDeleted(false)}>
                  Back to Signature List
                </Button>
              </div>
            ) : (
              <EmptyState
                type="signatures"
                actionLabel="Create Signature"
                onAction={() => setIsCreateDialogOpen(true)}
              />
            )
          )}
        </div>
      </main>
      
      <Footer />

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Signature</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Signature Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., John Doe Signature"
              />
              {formErrors.name && (
                <p className="text-sm text-destructive">{formErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="e.g., Director, Manager, CEO (optional)"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Draw Signature *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearSignature}
                  className="gap-2"
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear
                </Button>
              </div>
              <div className="rounded-lg border-2 border-border bg-white">
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    className: "signature-canvas w-full h-48",
                    style: { width: '100%', height: '192px' }
                  }}
                  backgroundColor="white"
                />
              </div>
              {formErrors.signature && (
                <p className="text-sm text-destructive">{formErrors.signature}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Draw your signature above using your mouse or touch screen
              </p>
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Signature</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Signature Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., John Doe Signature"
              />
              {formErrors.name && (
                <p className="text-sm text-destructive">{formErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Input
                id="edit-role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="e.g., Director, Manager, CEO (optional)"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Draw Signature *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearSignature}
                  className="gap-2"
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear
                </Button>
              </div>
              <div className="rounded-lg border-2 border-border bg-white">
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    className: "signature-canvas w-full h-48",
                    style: { width: '100%', height: '192px' }
                  }}
                  backgroundColor="white"
                />
              </div>
              {formErrors.signature && (
                <p className="text-sm text-destructive">{formErrors.signature}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Draw your signature above using your mouse or touch screen
              </p>
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
              This will permanently delete <strong>{selectedSignature?.name}</strong>.
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

