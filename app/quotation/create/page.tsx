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
import { useRouter } from "next/navigation"
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

export default function CreateQuotationPage() {
  const router = useRouter()
  
  // Form fields
  const [selectedCompanyId, setSelectedCompanyId] = useState("")
  const [productionDate, setProductionDate] = useState<Date>()
  const [billTo, setBillTo] = useState("")
  const [notes, setNotes] = useState("")
  const [remarks, setRemarks] = useState<Remark[]>([
    { id: "1", text: "Digital Use, Sosmed and Website Only", isCompleted: false },
    { id: "2", text: "Overtime Production Shooting Day 10 % dari Fee Invoice", isCompleted: false },
    { id: "3", text: "Small Ussage ( Flyer, Katalog, Brosur, Kupon, Kotak Gift, Booklet PR Package, Kartu Ucapan ) 15% dari Invoice awal", isCompleted: false },
    { id: "4", text: "Medium Ussage (POP, TV Store, TV Led Instore, both, bazaar, Backwall, Wobler, add 20%", isCompleted: false },
    { id: "5", text: "Big Print (Billboard, OOH Outdoor, LED Screen Outdoor, Megatron, Umbull, dll) 50% + tnc berlanjut", isCompleted: false },
    { id: "6", text: "Apabila ada Penambahan Media Usage/Media Placement diluar kesepakatan Awal akan di kenakan denda Sebagai berikut: 15%", isCompleted: false },
  ])
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
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<any>({})
  const [hasInteracted, setHasInteracted] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle")
  const [createdQuotationId, setCreatedQuotationId] = useState<string | null>(null)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  // Fetch master data
  useEffect(() => {
    Promise.all([
      fetch("/api/companies").then(res => res.json()),
      fetch("/api/billings").then(res => res.json()),
      fetch("/api/signatures").then(res => res.json()),
      fetch("/api/products").then(res => res.json()),
    ]).then(([companiesData, billingsData, signaturesData, productsData]) => {
      setCompanies(companiesData)
      setBillings(billingsData)
      setSignatures(signaturesData)
      setProducts(productsData.map((p: any) => p.name))
    }).catch(console.error)
  }, [])

  // Auto-save effect
  useEffect(() => {
    if (hasInteracted) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
      autoSaveTimerRef.current = setTimeout(() => {
        handleSubmit("draft", true) // Pass true to indicate auto-save
      }, 30000) // 30 seconds
    }
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [selectedCompanyId, productionDate, billTo, notes, remarks, selectedBillingId, selectedSignatureId, pph, items, hasInteracted])

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

  // Item management
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
    setItems(items.map(item =>
      item.id === itemId ? { ...item, productName } : item
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
    markInteracted()
    setItems(items.map(item => {
      if (item.id === itemId) {
        // Prevent removing the last detail
        if (item.details.length <= 1) {
          toast.warning("Cannot remove detail", {
            description: "Each item must have at least one detail."
          })
          return item
        }
        
        const newDetails = item.details.filter(d => d.id !== detailId)
        return {
          ...item,
          details: newDetails,
          total: newDetails.reduce((sum, d) => sum + d.amount, 0)
        }
      }
      return item
    }))
  }

  const updateDetail = (itemId: string, detailId: string, field: string, value: string) => {
    markInteracted()
    setItems(items.map(item => {
      if (item.id !== itemId) return item

      const updatedDetails = item.details.map(detail => {
        if (detail.id !== detailId) return detail

        const updated = { ...detail, [field]: value }
        
        // Calculate amount
        const unitPrice = parseFloat(updated.unitPrice) || 0
        const qty = parseFloat(updated.qty) || 0
        updated.amount = unitPrice * qty

        return updated
      })

      // Calculate item total
      const total = updatedDetails.reduce((sum, d) => sum + d.amount, 0)

      return { ...item, details: updatedDetails, total }
    }))
  }

  // Calculate totals
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

  const handleSubmit = async (status: "draft" | "pending", isAutoSave: boolean = false) => {
    if (saving) return
    if (!validateForm() && !isAutoSave) {
      toast.error("Validation failed", {
        description: "Please fill in all required fields"
      })
      return
    }

    // Additional validation for pending status
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
    if (isAutoSave) {
      setAutoSaveStatus("saving")
    }
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
        items: items.map(item => ({
          productName: item.productName,
          total: item.total,
          details: item.details.map(detail => ({
            detail: detail.detail,
            unitPrice: parseFloat(detail.unitPrice) || 0,
            qty: parseFloat(detail.qty) || 0,
            amount: detail.amount
          }))
        })),
        remarks: remarks.filter(r => r.text.trim()).map(remark => ({
          text: remark.text,
          isCompleted: remark.isCompleted
        }))
      }

      let response
      if (createdQuotationId) {
        // Update existing draft
        response = await fetch(`/api/quotation/${createdQuotationId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        // Create new quotation
        response = await fetch("/api/quotation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }

      if (response.ok) {
        const data = await response.json()
        setCreatedQuotationId(data.id) // Store the ID for subsequent auto-saves
        
        if (!isAutoSave) {
          const statusText = status === "pending" ? "saved as pending" : "saved as draft"
          toast.success("Quotation saved successfully", {
            description: `Quotation has been ${statusText}.`
          })
          
          // Redirect to view page if pending, otherwise to list
          if (status === "pending") {
            router.push(`/quotation/${data.id}/view`)
          } else {
            router.push("/quotation")
          }
        } else {
          setAutoSaveStatus("saved")
          setTimeout(() => setAutoSaveStatus("idle"), 3000)
        }
      } else {
        const errorData = await response.json()
        if (!isAutoSave) {
          toast.error("Failed to save quotation", {
            description: errorData.error || "An error occurred while saving."
          })
        } else {
          setAutoSaveStatus("error")
        }
      }
    } catch (error) {
      console.error("Error saving quotation:", error)
      if (!isAutoSave) {
        toast.error("Failed to save quotation", {
          description: "An unexpected error occurred."
        })
      } else {
        setAutoSaveStatus("error")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader title="Create Quotation" showBackButton={true} backTo="/quotation" />
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
        <div className="container mx-auto max-w-5xl space-y-6">
          <Breadcrumb items={[
            { label: "Quotations", href: "/quotation" },
            { label: "Create" }
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

              {/* Items Section */}
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
                    {items.map((item, itemIndex) => (
                      <Card key={item.id} className="border-2">
                        <CardContent className="space-y-4 pt-4">
                          {/* Product Header */}
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

                          {/* Details Header */}
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Details</Label>

                            {item.details.length === 0 ? (
                              <p className="text-xs text-muted-foreground py-2">
                                No details added yet. Click "Add Detail" to start.
                              </p>
                            ) : (
                              <>
                                {/* Details Table Header */}
                                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 px-3 py-2 bg-muted rounded-md text-xs font-bold">
                                  <div>Detail</div>
                                  <div>Unit Price</div>
                                  <div>Qty</div>
                                  <div>Amount</div>
                                  <div className="w-8"></div>
                                </div>

                                {/* Details Rows */}
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
                                        disabled={item.details.length === 1}
                                        className="h-9 w-8 p-0"
                                        title={item.details.length === 1 ? "Cannot remove the last detail" : "Remove detail"}
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

                          {/* Product Total */}
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

