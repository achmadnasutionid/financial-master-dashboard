"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { useFetch } from "@/hooks/use-fetch"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Download, MessageCircle, FileText } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { PDFDownloadLink, pdf } from "@react-pdf/renderer"
import { PlanningPDF } from "@/components/pdf/planning-pdf"
import { LazyPDFViewer } from "@/components/pdf/lazy-pdf-viewer"
import { toast } from "sonner"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PPH_OPTIONS } from "@/lib/constants"

interface PlanningItem {
  productName: string
  budget: number
  expense: number
}

interface Planning {
  planningId: string
  projectName: string
  clientName: string
  clientBudget: number
  notes?: string
  status: string
  generatedQuotationId?: string
  items: PlanningItem[]
  createdAt: string
  updatedAt: string
}

export default function ViewPlanningPage() {
  const params = useParams()
  const router = useRouter()
  const planningId = params?.id as string
  const [mounted, setMounted] = useState(false)
  const [generatingQuotation, setGeneratingQuotation] = useState(false)
  
  // Use SWR for cached data fetching
  const { data: planning, isLoading: loading } = useFetch<Planning>(
    planningId ? `/api/planning/${planningId}` : null
  )
  
  // Quotation generation dialog state
  const [showQuotationDialog, setShowQuotationDialog] = useState(false)
  const [companies, setCompanies] = useState<any[]>([])
  const [billings, setBillings] = useState<any[]>([])
  const [signatures, setSignatures] = useState<any[]>([])
  const [selectedCompany, setSelectedCompany] = useState("")
  const [selectedBilling, setSelectedBilling] = useState("")
  const [selectedSignature, setSelectedSignature] = useState("")
  const [selectedPph, setSelectedPph] = useState("0")

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch master data for quotation generation
  useEffect(() => {
    if (showQuotationDialog) {
      Promise.all([
        fetch("/api/companies").then(res => res.json()),
        fetch("/api/billings").then(res => res.json()),
        fetch("/api/signatures").then(res => res.json())
      ]).then(([companiesData, billingsData, signaturesData]) => {
        setCompanies(companiesData)
        setBillings(billingsData)
        setSignatures(signaturesData)
      }).catch(error => {
        console.error("Error fetching master data:", error)
        toast.error("Failed to load master data")
      })
    }
  }, [showQuotationDialog])

  // Handle generate or navigate to quotation
  const handleViewQuotation = async () => {
    if (planning?.generatedQuotationId) {
      // Fetch quotation to check status
      try {
        const response = await fetch(`/api/quotation/${planning.generatedQuotationId}`)
        if (response.ok) {
          const quotation = await response.json()
          // Navigate to view if accepted, edit otherwise
          if (quotation.status === "accepted") {
            router.push(`/quotation/${planning.generatedQuotationId}/view`)
          } else {
            router.push(`/quotation/${planning.generatedQuotationId}/edit`)
          }
        } else {
          toast.error("Failed to load quotation")
        }
      } catch (error) {
        console.error("Error fetching quotation:", error)
        toast.error("Failed to load quotation")
      }
    } else {
      // Open dialog to generate new quotation
      setShowQuotationDialog(true)
    }
  }

  // Generate quotation
  const handleGenerateQuotation = async () => {
    if (!selectedCompany || !selectedBilling || !selectedSignature) {
      toast.error("Missing required fields", {
        description: "Please select company, billing, and signature."
      })
      return
    }

    setGeneratingQuotation(true)
    try {
      const response = await fetch(`/api/planning/${planningId}/generate-quotation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selectedCompany,
          billingId: selectedBilling,
          signatureId: selectedSignature,
          pph: selectedPph
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success("Quotation generated successfully!")
        setShowQuotationDialog(false)
        // Navigate to edit the generated quotation
        // API returns full quotation object with 'id' property
        router.push(`/quotation/${data.id}/edit`)
      } else {
        const errorData = await response.json()
        toast.error("Failed to generate quotation", {
          description: errorData.error || "An error occurred"
        })
      }
    } catch (error) {
      console.error("Error generating quotation:", error)
      toast.error("Failed to generate quotation")
    } finally {
      setGeneratingQuotation(false)
    }
  }

  // Open WhatsApp with planning details and download PDF
  const handleWhatsApp = async () => {
    if (!planning) return

    try {
      // Generate and download the PDF
      const blob = await pdf(<PlanningPDF data={planning} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${planning.planningId}_${planning.projectName.replace(/\s+/g, "_")}.pdf`
      link.click()
      URL.revokeObjectURL(url)

      // Open WhatsApp Web with pre-filled message
      const message = `Hi! Here's the planning details:\n\n*${planning.planningId}*\nProject: ${planning.projectName}\nClient: ${planning.clientName}\nBudget: ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(planning.clientBudget)}\n\nI've attached the PDF document for your review.`

      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
      
      // Small delay to ensure download starts first
      setTimeout(() => {
        window.open(whatsappUrl, "_blank")
      }, 500)

      toast.success("PDF downloaded!", {
        description: "WhatsApp is opening. Please attach the downloaded PDF manually.",
      })
    } catch (error: any) {
      console.error("Error preparing WhatsApp share:", error)
      toast.error("Failed to prepare share", {
        description: "Could not download PDF or open WhatsApp.",
      })
    }
  }

  if (loading || !mounted) {
    return (
      <div className="flex min-h-screen flex-col">
        <PageHeader title="View Planning" showBackButton={true} backTo="/planning" />
        <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
          <div className="container mx-auto max-w-7xl space-y-6">
            <div className="h-8 w-64 animate-pulse rounded bg-muted" />
            <div className="h-[calc(100vh-250px)] w-full animate-pulse rounded-lg bg-muted" />
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!planning) {
    return (
      <div className="flex min-h-screen flex-col">
        <PageHeader title="View Planning" showBackButton={true} backTo="/planning" />
        <main className="flex flex-1 items-center justify-center">
          <p>Planning not found</p>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader title="View Planning" showBackButton={true} backTo="/planning" />
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
        <div className="container mx-auto max-w-7xl space-y-6">
          <Breadcrumb items={[
            { label: "Planning", href: "/planning" },
            { label: planning?.planningId || planningId }
          ]} />
          {/* Header with download button */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {planning.planningId} - {planning.projectName}
              </h2>
              <p className="text-sm text-muted-foreground">
                Client: {planning.clientName} | Status: {planning.status.toUpperCase()}
              </p>
            </div>
            {planning.status === "final" && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleViewQuotation}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {planning.generatedQuotationId ? "View Quotation" : "Generate Quotation"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleWhatsApp}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp
                </Button>
                <PDFDownloadLink
                  document={<PlanningPDF data={planning} />}
                  fileName={`${planning.planningId}_${planning.projectName.replace(
                    /\s+/g,
                    "_"
                  )}.pdf`}
                >
                  {({ loading }) => (
                    <Button disabled={loading}>
                      <Download className="mr-2 h-4 w-4" />
                      {loading ? "Preparing..." : "Download PDF"}
                    </Button>
                  )}
                </PDFDownloadLink>
              </div>
            )}
          </div>

          {/* PDF Viewer */}
          <div className="h-[calc(100vh-250px)] w-full overflow-hidden rounded-lg border bg-white shadow-lg">
            <LazyPDFViewer
              style={{
                width: "100%",
                height: "100%",
                border: "none",
              }}
              showToolbar={true}
            >
              <PlanningPDF data={planning} />
            </LazyPDFViewer>
          </div>
        </div>
      </main>
      <Footer />

      {/* Quotation Generation Dialog */}
      <Dialog open={showQuotationDialog} onOpenChange={setShowQuotationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Quotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company *</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="billing">Billing *</Label>
              <Select value={selectedBilling} onValueChange={setSelectedBilling}>
                <SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="signature">Signature *</Label>
              <Select value={selectedSignature} onValueChange={setSelectedSignature}>
                <SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="pph">PPh *</Label>
              <Select value={selectedPph} onValueChange={setSelectedPph}>
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
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowQuotationDialog(false)}
              disabled={generatingQuotation}
            >
              Cancel
            </Button>
            <Button onClick={handleGenerateQuotation} disabled={generatingQuotation}>
              {generatingQuotation ? "Generating..." : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

