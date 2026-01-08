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
import { compressFinalWorkScreenshot } from "@/lib/image-utils"

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

interface Signature {
  id: string
  name: string
  role?: string
  imageData: string
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

export default function CreateErhaTicketPage() {
  const router = useRouter()
  
  // Form fields
  const [selectedCompanyId, setSelectedCompanyId] = useState("")
  const [productionDate, setProductionDate] = useState<Date>()
  const [quotationDate, setQuotationDate] = useState<Date>()
  const [invoiceBastDate, setInvoiceBastDate] = useState<Date>()
  const [billTo, setBillTo] = useState("")
  const [billToAddress, setBillToAddress] = useState("")
  const [contactPerson, setContactPerson] = useState("")
  const [contactPosition, setContactPosition] = useState("")
  const [remarks, setRemarks] = useState<Remark[]>([
    { id: "1", text: "Terms & Conditions :", isCompleted: false },
    { id: "2", text: "* Overtime Production Shooting Day 10 % dari Fee invoice", isCompleted: false },
    { id: "3", text: "* Quotation is valid for 7 days from the issue date.", isCompleted: false },
    { id: "4", text: "* 50% down payment must be paid at least 1 day before the first project meeting. The remaining 50% is paid after the project is finished.", isCompleted: false },
    { id: "5", text: "* More than 3 revisions per frame will be charged extra.", isCompleted: false },
    { id: "6", text: "Penalty will be applied if client use our Photo & Videshoot without our consent for printed media placement outside the initial agreement :", isCompleted: false },
    { id: "7", text: "* Small Ussage ( Flyer, Katalog, Brosur, Kupon, Kotak Gift, Booklet PR Package, Kartu Ucapan ) 15% dari invoice awal", isCompleted: false },
    { id: "8", text: "* Medium Ussage (POP, TV Store, TV Led Instore, both, bazaar, Backwall, Wobler, add 20%", isCompleted: false },
    { id: "9", text: "* Big Print (Billboard, OOH Outdoor, LED Screen Outdoor, Megatron, Umbull, dll) 50% + tnc berlanjut", isCompleted: false },
    { id: "10", text: "* Additional overseas media placement (digital and printed) will be charged .(bisa di edit) % of total", isCompleted: false },
  ])
  const [selectedBillingId, setSelectedBillingId] = useState("")
  const [selectedSignatureId, setSelectedSignatureId] = useState("")
  const [pph, setPph] = useState("2") // Auto-select PPH 23 2%
  const [items, setItems] = useState<Item[]>([])
  const [finalWorkImage, setFinalWorkImage] = useState<string>("")
  
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
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null)
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
  }, [selectedCompanyId, productionDate, quotationDate, invoiceBastDate, billTo, billToAddress, contactPerson, contactPosition, remarks, selectedBillingId, selectedSignatureId, pph, items, finalWorkImage, hasInteracted])

  const markInteracted = () => {
    if (!hasInteracted) {
      setHasInteracted(true)
    }
  }

  // Handle screenshot final work upload with compression
  const handleFinalWorkImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    markInteracted()
    const file = e.target.files?.[0]
    if (file) {
      try {
        const compressedImage = await compressFinalWorkScreenshot(file)
        setFinalWorkImage(compressedImage)
      } catch (error) {
        console.error("Failed to compress image:", error)
        toast.error("Failed to process image")
      }
    }
  }

  const removeFinalWorkImage = () => {
    markInteracted()
    setFinalWorkImage("")
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

  const validateField = (field: string, value: string | Date | null | undefined) => {
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
      case "quotationDate":
        if (!value) {
          fieldErrors.quotationDate = "Quotation date is required"
        } else {
          delete fieldErrors.quotationDate
        }
        break
      case "invoiceBastDate":
        if (!value) {
          fieldErrors.invoiceBastDate = "Invoice/BAST date is required"
        } else {
          delete fieldErrors.invoiceBastDate
        }
        break
      case "billTo":
        if (!value || (typeof value === "string" && !value.trim())) {
          fieldErrors.billTo = "Bill To is required"
        } else {
          delete fieldErrors.billTo
        }
        break
      case "billToAddress":
        if (!value || (typeof value === "string" && !value.trim())) {
          fieldErrors.billToAddress = "Bill To Address is required"
        } else {
          delete fieldErrors.billToAddress
        }
        break
      case "contactPerson":
        if (!value || (typeof value === "string" && !value.trim())) {
          fieldErrors.contactPerson = "Contact Person is required"
        } else {
          delete fieldErrors.contactPerson
        }
        break
      case "contactPosition":
        if (!value || (typeof value === "string" && !value.trim())) {
          fieldErrors.contactPosition = "Position is required"
        } else {
          delete fieldErrors.contactPosition
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
    if (!quotationDate) newErrors.quotationDate = "Quotation date is required"
    if (!invoiceBastDate) newErrors.invoiceBastDate = "Invoice/BAST date is required"
    if (!billTo.trim()) newErrors.billTo = "Bill To is required"
    if (!billToAddress.trim()) newErrors.billToAddress = "Bill To Address is required"
    if (!contactPerson.trim()) newErrors.contactPerson = "Contact Person is required"
    if (!contactPosition.trim()) newErrors.contactPosition = "Position is required"
    if (!selectedBillingId) newErrors.billing = "Billing is required"
    if (!selectedSignatureId) newErrors.signature = "Signature is required"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (status: "draft" | "pending", isAutoSave: boolean = false) => {
    if (saving) return
    // For auto-save, skip if required fields are missing
    if (isAutoSave && (!selectedCompanyId || !productionDate || !quotationDate || !invoiceBastDate || !billTo.trim() || !billToAddress.trim() || !contactPerson.trim() || !contactPosition.trim() || !selectedBillingId || !selectedSignatureId)) {
      return
    }

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
        quotationDate: quotationDate!.toISOString(),
        invoiceBastDate: invoiceBastDate!.toISOString(),
        billTo: billTo.trim(),
        billToAddress: billToAddress.trim(),
        contactPerson: contactPerson.trim(),
        contactPosition: contactPosition.trim(),
        billingName: billing.name,
        billingBankName: billing.bankName,
        billingBankAccount: billing.bankAccount,
        billingBankAccountName: billing.bankAccountName,
        billingKtp: billing.ktp || null,
        billingNpwp: billing.npwp || null,
        signatureName: signature.name,
        signatureRole: signature.role || null,
        signatureImageData: signature.imageData,
        finalWorkImageData: finalWorkImage || null,
        pph,
        totalAmount: calculateTotalAmount(),
        status,
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
        })),
        remarks: remarks.filter(r => r.text.trim()).map(remark => ({
          text: remark.text,
          isCompleted: remark.isCompleted
        }))
      }

      let response
      if (createdTicketId) {
        // Update existing draft
        response = await fetch(`/api/erha/${createdTicketId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        // Create new ticket
        response = await fetch("/api/erha", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }

      if (response.ok) {
        const data = await response.json()
        setCreatedTicketId(data.id) // Store the ID for subsequent auto-saves
        
        if (!isAutoSave) {
          const statusText = status === "pending" ? "saved as pending" : "saved as draft"
          toast.success("Erha Ticket saved successfully", {
            description: `Erha Ticket has been ${statusText}.`
          })
          
          // Redirect to view page
          router.push(`/special-case/erha/${data.id}/view`)
        } else {
          setAutoSaveStatus("saved")
          setTimeout(() => setAutoSaveStatus("idle"), 3000)
        }
      } else {
        const errorData = await response.json()
        if (!isAutoSave) {
          toast.error("Failed to save erha ticket", {
            description: errorData.error || "An error occurred while saving."
          })
        } else {
          setAutoSaveStatus("error")
        }
      }
    } catch (error) {
      console.error("Error saving erha ticket:", error)
      if (!isAutoSave) {
        toast.error("Failed to save erha ticket", {
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
      <PageHeader title="Create Erha Ticket" showBackButton={true} backTo="/special-case/erha" />
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
        <div className="container mx-auto max-w-5xl space-y-6">
          <Breadcrumb items={[
            { label: "Erha Tickets", href: "/special-case/erha" },
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Quotation Date <span className="text-destructive">*</span></Label>
                    <DatePicker date={quotationDate} onDateChange={(date) => {
                      markInteracted()
                      setQuotationDate(date)
                      if (errors.quotationDate) validateField("quotationDate", date || null)
                    }} error={!!errors.quotationDate} />
                    {errors.quotationDate && (
                      <p className="text-sm text-destructive">{errors.quotationDate}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Invoice / BAST Date <span className="text-destructive">*</span></Label>
                    <DatePicker date={invoiceBastDate} onDateChange={(date) => {
                      markInteracted()
                      setInvoiceBastDate(date)
                      if (errors.invoiceBastDate) validateField("invoiceBastDate", date || null)
                    }} error={!!errors.invoiceBastDate} />
                    {errors.invoiceBastDate && (
                      <p className="text-sm text-destructive">{errors.invoiceBastDate}</p>
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
                  <Label>Bill To Address <span className="text-destructive">*</span></Label>
                  <Textarea
                    value={billToAddress}
                    onChange={(e) => {
                      markInteracted()
                      setBillToAddress(e.target.value)
                      if (errors.billToAddress) validateField("billToAddress", e.target.value)
                    }}
                    onBlur={(e) => validateField("billToAddress", e.target.value)}
                    placeholder="Enter bill to address"
                    error={!!errors.billToAddress}
                  />
                  {errors.billToAddress && (
                    <p className="text-sm text-destructive">{errors.billToAddress}</p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Contact Person <span className="text-destructive">*</span></Label>
                    <Input
                      value={contactPerson}
                      onChange={(e) => {
                        markInteracted()
                        setContactPerson(e.target.value)
                        if (errors.contactPerson) validateField("contactPerson", e.target.value)
                      }}
                      onBlur={(e) => validateField("contactPerson", e.target.value)}
                      placeholder="Enter contact person name"
                      error={!!errors.contactPerson}
                    />
                    {errors.contactPerson && (
                      <p className="text-sm text-destructive">{errors.contactPerson}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Position <span className="text-destructive">*</span></Label>
                    <Input
                      value={contactPosition}
                      onChange={(e) => {
                        markInteracted()
                        setContactPosition(e.target.value)
                        if (errors.contactPosition) validateField("contactPosition", e.target.value)
                      }}
                      onBlur={(e) => validateField("contactPosition", e.target.value)}
                      placeholder="Enter position/title"
                      error={!!errors.contactPosition}
                    />
                    {errors.contactPosition && (
                      <p className="text-sm text-destructive">{errors.contactPosition}</p>
                    )}
                  </div>
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

              {/* Billing Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Billing Information</h3>
                
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

                {selectedBillingId && (() => {
                  const selectedBilling = billings.find(b => b.id === selectedBillingId)
                  if (!selectedBilling) return null
                  return (
                    <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
                      <p className="text-sm"><span className="font-medium">Bank:</span> {selectedBilling.bankName}</p>
                      <p className="text-sm"><span className="font-medium">Account:</span> {selectedBilling.bankAccount}</p>
                      <p className="text-sm"><span className="font-medium">Account Name:</span> {selectedBilling.bankAccountName}</p>
                      {selectedBilling.npwp && (
                        <p className="text-sm"><span className="font-medium">NPWP:</span> {selectedBilling.npwp}</p>
                      )}
                      {selectedBilling.ktp && (
                        <p className="text-sm"><span className="font-medium">KTP:</span> {selectedBilling.ktp}</p>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* Signature Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Signature Information</h3>
                
                <div className="grid gap-4 sm:grid-cols-2">
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
              </div>

              {/* Screenshot Final Work */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Screenshot Final Work</h3>
                <div className="space-y-2">
                  <Label>Upload Screenshot (for BAST PDF)</Label>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFinalWorkImageChange}
                      className="hidden"
                      id="finalWorkImageInput"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('finalWorkImageInput')?.click()}
                    >
                      Choose File
                    </Button>
                  </div>
                  {finalWorkImage && (
                    <div className="mt-2">
                      <img 
                        src={finalWorkImage} 
                        alt="Final work screenshot" 
                        className="max-w-xs rounded border"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={removeFinalWorkImage}
                        className="mt-2"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Image
                      </Button>
                    </div>
                  )}
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

