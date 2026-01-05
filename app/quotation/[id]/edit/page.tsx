"use client"

import { useEffect, useState, useRef } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { AutoExpandInput } from "@/components/ui/auto-expand-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Save, CheckCircle, Plus, Trash2 } from "lucide-react"
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
import { PPH_OPTIONS } from "@/lib/constants"

interface Company {
  id: string
  name: string
  address: string
  city: string
  province: string
  postalCode?: string
  telp?: string
  email?: string
}

interface Billing {
  id: string
  name: string
  bankName: string
  bankAccount: string
  bankAccountName: string
  ktp?: string
  npwp?: string
}

interface Signature {
  id: string
  name: string
  role?: string
  imageData: string
}

interface ItemDetail {
  id: string
  detail: string
  unitPrice: string
  qty: string
  amount: number
}

interface Item {
  id: string
  productName: string
  details: ItemDetail[]
  total: number
}

interface Remark {
  id: string
  text: string
  isCompleted: boolean
}

export default function EditQuotationPage() {
  const router = useRouter()
  const params = useParams()
  const quotationId = params?.id as string
  
  // Form fields
  const [selectedCompanyId, setSelectedCompanyId] = useState("")
  const [productionDate, setProductionDate] = useState<Date>()
  const [billTo, setBillTo] = useState("")
  const [notes, setNotes] = useState("")
  const [remarks, setRemarks] = useState<Remark[]>([])
  const [selectedBillingId, setSelectedBillingId] = useState("")
  const [selectedSignatureId, setSelectedSignatureId] = useState("")
  const [pph, setPph] = useState("0")
  const [items, setItems] = useState<Item[]>([])
  
  // Master data
  const [companies, setCompanies] = useState<Company[]>([])
  const [billings, setBillings] = useState<Billing[]>([])
  const [signatures, setSignatures] = useState<Signature[]>([])
  const [products, setProducts] = useState<string[]>([])
  
  // UI state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<any>({})
  const [quotationStatus, setQuotationStatus] = useState<string>("")
  const [hasInteracted, setHasInteracted] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle")
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch quotation data
  useEffect(() => {
    if (!quotationId) return

    Promise.all([
      fetch(`/api/quotation/${quotationId}`).then(res => res.json()),
      fetch("/api/companies").then(res => res.json()),
      fetch("/api/billings").then(res => res.json()),
      fetch("/api/signatures").then(res => res.json()),
      fetch("/api/products").then(res => res.json()),
    ]).then(([quotationData, companiesData, billingsData, signaturesData, productsData]) => {
      // Check if quotation is finalized
      if (quotationData.status === "accepted") {
        toast.error("Cannot edit accepted quotation", {
          description: "This quotation has been accepted and cannot be edited."
        })
        router.push("/quotation")
        return
      }

      setQuotationStatus(quotationData.status)
      
      // Find company by name
      const company = companiesData.find((c: Company) => c.name === quotationData.companyName)
      if (company) setSelectedCompanyId(company.id)
      
      // Parse production date safely
      const parsedDate = quotationData.productionDate ? new Date(quotationData.productionDate) : new Date()
      setProductionDate(isNaN(parsedDate.getTime()) ? new Date() : parsedDate)
      
      setBillTo(quotationData.billTo)
      setNotes(quotationData.notes || "")
      
      // Find billing by name
      const billing = billingsData.find((b: Billing) => b.name === quotationData.billingName)
      if (billing) setSelectedBillingId(billing.id)
      
      // Find signature by name
      const signature = signaturesData.find((s: Signature) => s.name === quotationData.signatureName)
      if (signature) setSelectedSignatureId(signature.id)
      
      setPph(quotationData.pph)
      
      // Load items with details
      const loadedItems = quotationData.items && Array.isArray(quotationData.items)
        ? quotationData.items.map((item: any) => ({
            id: item.id,
            productName: item.productName,
            total: item.total,
            details: item.details && Array.isArray(item.details)
              ? item.details.map((detail: any) => ({
                  id: detail.id,
                  detail: detail.detail,
                  unitPrice: detail.unitPrice.toString(),
                  qty: detail.qty.toString(),
                  amount: detail.amount
                }))
              : []
          }))
        : []
      setItems(loadedItems)
      
      // Load remarks
      const loadedRemarks = quotationData.remarks && Array.isArray(quotationData.remarks)
        ? quotationData.remarks.map((remark: any) => ({
            id: remark.id,
            text: remark.text,
            isCompleted: remark.isCompleted
          }))
        : []
      setRemarks(loadedRemarks)
      
      setCompanies(companiesData)
      setBillings(billingsData)
      setSignatures(signaturesData)
      setProducts(productsData.map((p: any) => p.name))
      
      setLoading(false)
    }).catch((error) => {
      console.error("Error fetching quotation:", error)
      toast.error("Failed to load quotation", {
        description: "An error occurred while loading the quotation."
      })
      setLoading(false)
    })
  }, [quotationId, router])

  // Mark as interacted on first change
  const markInteracted = () => {
    if (!hasInteracted) {
      setHasInteracted(true)
    }
  }

  // Remark management
  const addRemark = () => {
    markInteracted()
    setRemarks([...remarks, {
      id: Date.now().toString(),
      text: "",
      isCompleted: false
    }])
  }

  const removeRemark = (id: string) => {
    markInteracted()
    setRemarks(remarks.filter(remark => remark.id !== id))
  }

  const updateRemarkText = (id: string, text: string) => {
    markInteracted()
    setRemarks(remarks.map(remark =>
      remark.id === id ? { ...remark, text } : remark
    ))
  }

  const toggleRemarkCompleted = (id: string) => {
    markInteracted()
    setRemarks(remarks.map(remark =>
      remark.id === id ? { ...remark, isCompleted: !remark.isCompleted } : remark
    ))
  }

  // Auto-save function
  const autoSave = async () => {
    if (!hasInteracted || !selectedCompanyId || !productionDate || !billTo || !selectedBillingId || !selectedSignatureId) {
      return
    }

    try {
      setAutoSaveStatus("saving")
      
      const company = companies.find(c => c.id === selectedCompanyId)!
      const billing = billings.find(b => b.id === selectedBillingId)!
      const signature = signatures.find(s => s.id === selectedSignatureId)!

      const payload = {
        companyName: company.name,
        companyAddress: company.address,
        companyCity: company.city,
        companyProvince: company.province,
        companyPostalCode: company.postalCode,
        companyTelp: company.telp,
        companyEmail: company.email,
        productionDate: productionDate!.toISOString(),
        billTo: billTo.trim(),
        notes: notes.trim() || null,
        billingName: billing.name,
        billingBankName: billing.bankName,
        billingBankAccount: billing.bankAccount,
        billingBankAccountName: billing.bankAccountName,
        billingKtp: billing.ktp,
        billingNpwp: billing.npwp,
        signatureName: signature.name,
        signatureRole: signature.role,
        signatureImageData: signature.imageData,
        pph,
        totalAmount: calculateTotalAmount(),
        status: quotationStatus || "draft", // Keep current status
        remarks: remarks.map(remark => ({
          text: remark.text,
          isCompleted: remark.isCompleted
        })),
        items: items.map(item => ({
          productName: item.productName,
          total: item.total,
          details: item.details
            .filter(detail => detail.detail.trim() || parseFloat(detail.unitPrice) || parseFloat(detail.qty))
            .map(detail => ({
              detail: detail.detail,
              unitPrice: parseFloat(detail.unitPrice) || 0,
              qty: parseFloat(detail.qty) || 0,
              amount: detail.amount
            }))
        }))
      }

      const response = await fetch(`/api/quotation/${quotationId}`, {
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
  }, [selectedCompanyId, productionDate, billTo, notes, remarks, selectedBillingId, selectedSignatureId, pph, items, hasInteracted])

  // Item management functions (same as create page)
  const addItem = () => {
    markInteracted()
    const newItemId = Date.now().toString()
    setItems([...items, {
      id: newItemId,
      productName: "",
      details: [{
        id: `${newItemId}-detail-${Date.now()}`,
        detail: "",
        unitPrice: "",
        qty: "",
        amount: 0
      }],
      total: 0
    }])
  }

  const removeItem = (itemId: string) => {
    markInteracted()
    setItems(items.filter(item => item.id !== itemId))
  }

  const updateItemName = (itemId: string, productName: string) => {
    markInteracted()
    // Auto-capitalize if not from master data
    const isFromMasterData = products.includes(productName)
    const finalName = isFromMasterData ? productName : productName.toUpperCase()
    setItems(items.map(item =>
      item.id === itemId ? { ...item, productName: finalName } : item
    ))
  }

  const addDetail = (itemId: string) => {
    markInteracted()
    setItems(items.map(item =>
      item.id === itemId
        ? {
            ...item,
            details: [...item.details, {
              id: Date.now().toString(),
              detail: "",
              unitPrice: "",
              qty: "",
              amount: 0
            }]
          }
        : item
    ))
  }

  const removeDetail = (itemId: string, detailId: string) => {
    const item = items.find(i => i.id === itemId)
    if (item && item.details.length === 1) {
      toast.warning("Cannot remove detail", {
        description: "Each product must have at least one detail."
      })
      return
    }
    
    markInteracted()
    setItems(items.map(item =>
      item.id === itemId
        ? {
            ...item,
            details: item.details.filter(d => d.id !== detailId),
            total: item.details
              .filter(d => d.id !== detailId)
              .reduce((sum, d) => sum + d.amount, 0)
          }
        : item
    ))
  }

  const updateDetail = (itemId: string, detailId: string, field: string, value: string) => {
    markInteracted()
    setItems(items.map(item => {
      if (item.id !== itemId) return item

      const updatedDetails = item.details.map(detail => {
        if (detail.id !== detailId) return detail

        const updated = { ...detail, [field]: value }
        
        const unitPrice = parseFloat(updated.unitPrice) || 0
        const qty = parseFloat(updated.qty) || 0
        updated.amount = unitPrice * qty

        return updated
      })

      const total = updatedDetails.reduce((sum, d) => sum + d.amount, 0)

      return { ...item, details: updatedDetails, total }
    }))
  }

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0)
  }

  const calculatePphAmount = () => {
    const netAmount = calculateSubtotal()
    const pphRate = parseFloat(pph)
    if (pphRate === 0) return 0
    // Formula: Gross = Net × (100 / (100 - pph%))
    // PPh Amount = Gross - Net
    const grossAmount = netAmount * (100 / (100 - pphRate))
    return grossAmount - netAmount
  }

  const calculateTotalAmount = () => {
    return calculateSubtotal() + calculatePphAmount()
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
      case "company":
        if (!value) {
          fieldErrors.company = "Company is required"
        } else {
          delete fieldErrors.company
        }
        break
      case "productionDate":
        if (!value) {
          fieldErrors.productionDate = "Production date is required"
        } else {
          delete fieldErrors.productionDate
        }
        break
      case "billTo":
        if (!value || (typeof value === "string" && !value.trim())) {
          fieldErrors.billTo = "Bill To is required"
        } else {
          delete fieldErrors.billTo
        }
        break
      case "billing":
        if (!value) {
          fieldErrors.billing = "Billing is required"
        } else {
          delete fieldErrors.billing
        }
        break
      case "signature":
        if (!value) {
          fieldErrors.signature = "Signature is required"
        } else {
          delete fieldErrors.signature
        }
        break
    }
    
    setErrors(fieldErrors)
  }

  const validateForm = () => {
    const newErrors: any = {}
    if (!selectedCompanyId) newErrors.company = "Company is required"
    if (!productionDate) newErrors.productionDate = "Production date is required"
    if (!billTo.trim()) newErrors.billTo = "Bill To is required"
    if (!selectedBillingId) newErrors.billing = "Billing is required"
    if (!selectedSignatureId) newErrors.signature = "Signature is required"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (status: "draft" | "pending") => {
    if (saving) return
    if (!validateForm()) {
      toast.error("Validation failed", {
        description: "Please fill in all required fields"
      })
      return
    }

    if (status === "pending") {
      if (items.length === 0) {
        toast.warning("Cannot save as pending", {
          description: "Please add at least one item before saving as pending."
        })
        return
      }

      const emptyProducts = items.filter(item => !item.productName.trim())
      if (emptyProducts.length > 0) {
        toast.warning("Cannot save as pending", {
          description: "All items must have a product name filled in."
        })
        return
      }

      const itemsWithoutDetails = items.filter(item => item.details.length === 0)
      if (itemsWithoutDetails.length > 0) {
        toast.warning("Cannot save as pending", {
          description: "All products must have at least one detail."
        })
        return
      }
    }

    setSaving(true)
    try {
      const company = companies.find(c => c.id === selectedCompanyId)!
      const billing = billings.find(b => b.id === selectedBillingId)!
      const signature = signatures.find(s => s.id === selectedSignatureId)!

      const payload = {
        companyName: company.name,
        companyAddress: company.address,
        companyCity: company.city,
        companyProvince: company.province,
        companyPostalCode: company.postalCode,
        companyTelp: company.telp,
        companyEmail: company.email,
        productionDate: productionDate!.toISOString(),
        billTo: billTo.trim(),
        notes: notes.trim() || null,
        billingName: billing.name,
        billingBankName: billing.bankName,
        billingBankAccount: billing.bankAccount,
        billingBankAccountName: billing.bankAccountName,
        billingKtp: billing.ktp,
        billingNpwp: billing.npwp,
        signatureName: signature.name,
        signatureRole: signature.role,
        signatureImageData: signature.imageData,
        pph,
        totalAmount: calculateTotalAmount(),
        status,
        remarks: remarks.map(remark => ({
          text: remark.text,
          isCompleted: remark.isCompleted
        })),
        items: items.map(item => ({
          productName: item.productName,
          total: item.total,
          details: item.details
            .filter(detail => detail.detail.trim() || parseFloat(detail.unitPrice) || parseFloat(detail.qty))
            .map(detail => ({
              detail: detail.detail,
              unitPrice: parseFloat(detail.unitPrice) || 0,
              qty: parseFloat(detail.qty) || 0,
              amount: detail.amount
            }))
        }))
      }

      const response = await fetch(`/api/quotation/${quotationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const statusText = status === "pending" ? "saved as pending" : "saved as draft"
        toast.success("Quotation updated successfully", {
          description: `Quotation has been ${statusText}.`
        })
        
        // Redirect to view page if pending, otherwise to list
        if (status === "pending") {
          router.push(`/quotation/${quotationId}/view`)
        } else {
          router.push("/quotation")
        }
      } else {
        const data = await response.json()
        toast.error("Failed to update quotation", {
          description: data.error || "An error occurred while updating."
        })
      }
    } catch (error) {
      console.error("Error updating quotation:", error)
      toast.error("Failed to update quotation", {
        description: "An unexpected error occurred."
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <PageHeader title="Edit Quotation" showBackButton={true} backTo="/quotation" />
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

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader title="Edit Quotation" showBackButton={true} backTo="/quotation" />
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
        <div className="container mx-auto max-w-5xl space-y-6">
          <Breadcrumb items={[
            { label: "Quotations", href: "/quotation" },
            { label: quotationId || "Edit" }
          ]} />
          <Card>
            <CardContent className="space-y-6 pt-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Company <span className="text-destructive">*</span></Label>
                    <Select value={selectedCompanyId} onValueChange={(value) => {
                      markInteracted()
                      setSelectedCompanyId(value)
                      if (errors.company) validateField("company", value)
                    }}>
                      <SelectTrigger error={!!errors.company}>
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.company && (
                      <p className="text-sm text-destructive">{errors.company}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Production Date <span className="text-destructive">*</span></Label>
                    <DatePicker date={productionDate} onDateChange={(date) => {
                      markInteracted()
                      setProductionDate(date)
                      if (errors.productionDate) validateField("productionDate", date || null)
                    }} error={!!errors.productionDate} />
                    {errors.productionDate && (
                      <p className="text-sm text-destructive">{errors.productionDate}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Bill To <span className="text-destructive">*</span></Label>
                  <Input
                    value={billTo}
                    onChange={(e) => {
                      markInteracted()
                      setBillTo(e.target.value)
                      if (errors.billTo) validateField("billTo", e.target.value)
                    }}
                    onBlur={(e) => validateField("billTo", e.target.value)}
                    placeholder="Enter bill to"
                    error={!!errors.billTo}
                  />
                  {errors.billTo && (
                    <p className="text-sm text-destructive">{errors.billTo}</p>
                  )}
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

                {/* Remarks Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Remarks</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addRemark}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Remark
                    </Button>
                  </div>
                  {remarks.length > 0 && (
                    <div className="space-y-2">
                      {remarks.map((remark) => (
                        <div key={remark.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={remark.isCompleted}
                            onChange={() => toggleRemarkCompleted(remark.id)}
                            className="h-4 w-4 rounded border-input"
                          />
                          <Input
                            value={remark.text}
                            onChange={(e) => updateRemarkText(remark.id, e.target.value)}
                            placeholder="Enter remark"
                            disabled={remark.isCompleted}
                            className={remark.isCompleted ? "line-through text-muted-foreground" : ""}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRemark(remark.id)}
                            className="h-9 w-9 p-0"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Payment Information</h3>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Billing <span className="text-destructive">*</span></Label>
                    <Select value={selectedBillingId} onValueChange={(value) => {
                      markInteracted()
                      setSelectedBillingId(value)
                      if (errors.billing) validateField("billing", value)
                    }}>
                      <SelectTrigger error={!!errors.billing}>
                        <SelectValue placeholder="Select billing" />
                      </SelectTrigger>
                      <SelectContent>
                        {billings.map((billing) => (
                          <SelectItem key={billing.id} value={billing.id}>
                            {billing.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.billing && (
                      <p className="text-sm text-destructive">{errors.billing}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Signature <span className="text-destructive">*</span></Label>
                    <Select value={selectedSignatureId} onValueChange={(value) => {
                      markInteracted()
                      setSelectedSignatureId(value)
                      if (errors.signature) validateField("signature", value)
                    }}>
                      <SelectTrigger error={!!errors.signature}>
                        <SelectValue placeholder="Select signature" />
                      </SelectTrigger>
                      <SelectContent>
                        {signatures.map((signature) => (
                          <SelectItem key={signature.id} value={signature.id}>
                            {signature.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.signature && (
                      <p className="text-sm text-destructive">{errors.signature}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>PPh</Label>
                  <Select value={pph} onValueChange={(value) => {
                    markInteracted()
                    setPph(value)
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select PPh" />
                    </SelectTrigger>
                    <SelectContent>
                      {PPH_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Items Section - Same as create page */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Items</h3>
                </div>

                {items.length === 0 ? (
                  <div className="rounded-md bg-muted p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No items added yet. Click "Add Product" to start.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <Card key={item.id} className="border-2">
                        <CardContent className="space-y-4 pt-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 space-y-2">
                              <Label>Product Name</Label>
                              <Input
                                value={item.productName}
                                onChange={(e) => updateItemName(item.id, e.target.value)}
                                placeholder="Type or select product"
                                list={`products-${item.id}`}
                              />
                              <datalist id={`products-${item.id}`}>
                                {products.map((product) => (
                                  <option key={product} value={product} />
                                ))}
                              </datalist>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              className="mt-8"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Details</Label>

                            {item.details.length === 0 ? (
                              <p className="text-xs text-muted-foreground py-2">
                                No details added yet. Click "Add Detail" to start.
                              </p>
                            ) : (
                              <>
                                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 px-3 py-2 bg-muted rounded-md text-xs font-bold">
                                  <div>Detail</div>
                                  <div>Unit Price</div>
                                  <div>Qty</div>
                                  <div>Amount</div>
                                  <div className="w-8"></div>
                                </div>

                                <div className="space-y-2">
                                  {item.details.map((detail) => (
                                    <div key={detail.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-center">
                                      <AutoExpandInput
                                        value={detail.detail}
                                        onChange={(e) =>
                                          updateDetail(item.id, detail.id, "detail", e.target.value)
                                        }
                                        placeholder="Enter detail"
                                      />
                                      <CurrencyInput
                                        value={detail.unitPrice}
                                        onValueChange={(value) =>
                                          updateDetail(item.id, detail.id, "unitPrice", value)
                                        }
                                        placeholder="Rp 0"
                                        className="h-9"
                                      />
                                      <Input
                                        type="number"
                                        value={detail.qty}
                                        onChange={(e) =>
                                          updateDetail(item.id, detail.id, "qty", e.target.value)
                                        }
                                        placeholder="0"
                                        className="h-9"
                                      />
                                      <div className="flex h-9 items-center rounded-md border px-3 text-sm font-medium bg-muted">
                                        {formatCurrency(detail.amount)}
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeDetail(item.id, detail.id)}
                                        className="h-9 w-8 p-0"
                                        disabled={item.details.length === 1}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}

                            {/* Add Detail Button - Moved to bottom */}
                            <div className="flex justify-end pt-2">
                              <Button
                                type="button"
                                onClick={() => addDetail(item.id)}
                                variant="outline"
                                size="sm"
                              >
                                <Plus className="mr-2 h-3 w-3" />
                                Add Detail
                              </Button>
                            </div>
                          </div>

                          <div className="flex justify-end border-t pt-3">
                            <div className="text-sm font-semibold">
                              Product Total: <span className="text-primary">{formatCurrency(item.total)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Add Product Button - Moved to bottom */}
                <div className="flex justify-end">
                  <Button type="button" onClick={addItem} variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </Button>
                </div>
              </div>

              {/* Summary */}
              {items.length > 0 && (
                <div className="space-y-3 rounded-lg border bg-card p-4">
                  <h3 className="text-lg font-semibold">Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{PPH_OPTIONS.find(opt => opt.value === pph)?.label || `PPh (${pph}%)`}:</span>
                      <span className="font-medium text-green-600">
                        + {formatCurrency(calculatePphAmount())}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2 text-base font-bold">
                      <span>Total Amount:</span>
                      <span className="text-primary">{formatCurrency(calculateTotalAmount())}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Auto-save status */}
                <AutoSaveIndicator status={autoSaveStatus} />
                <div className="flex flex-wrap gap-3 ml-auto">
                  {quotationStatus === "draft" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSubmit("draft")}
                      disabled={saving}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save as Draft
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={() => handleSubmit("pending")}
                    disabled={saving}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save as Pending
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}

