"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { useFetch } from "@/hooks/use-fetch"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Download, MessageCircle, FileText, CheckCircle } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { PDFDownloadLink, pdf } from "@react-pdf/renderer"
import { QuotationPDF } from "@/components/pdf/quotation-pdf"
import { LazyPDFViewer } from "@/components/pdf/lazy-pdf-viewer"
import { toast } from "sonner"
import { Breadcrumb } from "@/components/ui/breadcrumb"
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

interface Quotation {
  quotationId: string
  companyName: string
  companyAddress: string
  companyCity: string
  companyProvince: string
  companyPostalCode?: string
  companyTelp?: string
  companyEmail?: string
  productionDate: string
  billTo: string
  notes?: string
  billingName: string
  billingBankName: string
  billingBankAccount: string
  billingBankAccountName: string
  signatureName: string
  signatureRole?: string
  signatureImageData: string
  pph: string
  totalAmount: number
  status: string
  generatedInvoiceId?: string
  remarks?: Array<{
    text: string
    isCompleted: boolean
  }>
  items: Array<{
    productName: string
    total: number
    details: Array<{
      detail: string
      unitPrice: number
      qty: number
      amount: number
    }>
  }>
  createdAt: string
  updatedAt: string
}

export default function ViewQuotationPage() {
  const params = useParams()
  const router = useRouter()
  const quotationId = params?.id as string
  const [mounted, setMounted] = useState(false)
  const [generatingInvoice, setGeneratingInvoice] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [showAcceptDialog, setShowAcceptDialog] = useState(false)

  // Use SWR for cached data fetching
  const { data: quotation, isLoading: loading, mutate } = useFetch<Quotation>(
    quotationId ? `/api/quotation/${quotationId}` : null
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  // Open WhatsApp with quotation details and download PDF
  const handleWhatsApp = async () => {
    if (!quotation) return

    try {
      // Generate and download the PDF
      const blob = await pdf(<QuotationPDF data={quotation} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${quotation.quotationId}_${quotation.billTo.replace(/\s+/g, "_")}.pdf`
      link.click()
      URL.revokeObjectURL(url)

      // Open WhatsApp Web with pre-filled message
      const message = `Hi! Here's the quotation details:\n\n*${quotation.quotationId}*\nClient: ${quotation.billTo}\nTotal Amount: ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(quotation.totalAmount)}\n\nI've attached the PDF document for your review.`

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

  // Handle generate or view invoice
  const handleViewInvoice = async () => {
    if (!quotation) return

    // If invoice already generated, navigate to it
    if (quotation.generatedInvoiceId) {
      try {
        const res = await fetch(`/api/invoice/${quotation.generatedInvoiceId}`)
        const invoiceData = await res.json()
        
        if (invoiceData.status === "paid") {
          router.push(`/invoice/${quotation.generatedInvoiceId}/view`)
        } else {
          router.push(`/invoice/${quotation.generatedInvoiceId}/edit`)
        }
      } catch (error) {
        console.error("Error fetching invoice:", error)
        toast.error("Failed to load invoice")
      }
      return
    }

    // Otherwise, show loading and generate invoice
    setGeneratingInvoice(true)
    try {
      const response = await fetch(`/api/quotation/${quotationId}/generate-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotationId })
      })

      if (response.ok) {
        const newInvoice = await response.json()
        toast.success("Invoice generated!", {
          description: "Redirecting to invoice edit page..."
        })
        
        // Revalidate data
        mutate()
        
        // Redirect to invoice edit page
        router.push(`/invoice/${newInvoice.id}/edit`)
      } else {
        const data = await response.json()
        toast.error("Failed to generate invoice", {
          description: data.error || "An error occurred."
        })
      }
    } catch (error) {
      console.error("Error generating invoice:", error)
      toast.error("Failed to generate invoice", {
        description: "An unexpected error occurred."
      })
    } finally {
      setGeneratingInvoice(false)
    }
  }

  // Handle accept quotation
  const handleAcceptQuotation = async () => {
    if (!quotation) return

    setAccepting(true)
    try {
      const response = await fetch(`/api/quotation/${quotationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" })
      })

      if (response.ok) {
        toast.success("Quotation accepted!", {
          description: "The quotation status has been updated to accepted."
        })
        
        // Update local state
        mutate()
      } else {
        const data = await response.json()
        toast.error("Failed to accept quotation", {
          description: data.error || "An error occurred."
        })
      }
    } catch (error) {
      console.error("Error accepting quotation:", error)
      toast.error("Failed to accept quotation", {
        description: "An unexpected error occurred."
      })
    } finally {
      setAccepting(false)
    }
  }

  if (loading || !mounted) {
    return (
      <div className="flex min-h-screen flex-col">
        <PageHeader title="View Quotation" showBackButton={true} backTo="/quotation" />
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

  if (!quotation) {
    return (
      <div className="flex min-h-screen flex-col">
        <PageHeader title="View Quotation" showBackButton={true} backTo="/quotation" />
        <main className="flex flex-1 items-center justify-center">
          <p>Quotation not found</p>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader title="View Quotation" showBackButton={true} backTo="/quotation" />
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
        <div className="container mx-auto max-w-7xl space-y-6">
          <Breadcrumb items={[
            { label: "Quotations", href: "/quotation" },
            { label: quotation?.quotationId || quotationId }
          ]} />
          {/* Header with download button */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {quotation.quotationId} - {quotation.billTo}
              </h2>
              <p className="text-sm text-muted-foreground">
                Status: {quotation.status.toUpperCase()}
              </p>
            </div>
            {quotation.status !== "draft" && (
              <div className="flex gap-2">
                {quotation.status === "pending" && (
                  <Button
                    onClick={() => setShowAcceptDialog(true)}
                    disabled={accepting}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {accepting ? "Accepting..." : "Accept Quotation"}
                  </Button>
                )}
                {quotation.status === "accepted" && (
                  <Button
                    variant="outline"
                    onClick={handleViewInvoice}
                    disabled={generatingInvoice}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {quotation.generatedInvoiceId
                      ? "View Invoice"
                      : generatingInvoice
                      ? "Generating..."
                      : "Generate Invoice"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleWhatsApp}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp
                </Button>
                <PDFDownloadLink
                  document={<QuotationPDF data={quotation} />}
                  fileName={`${quotation.quotationId}_${quotation.billTo.replace(
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
              <QuotationPDF data={quotation} />
            </LazyPDFViewer>
          </div>
        </div>
      </main>
      <Footer />

      {/* Accept Quotation Confirmation Dialog */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept Quotation?</AlertDialogTitle>
            <AlertDialogDescription>
              Once accepted, this quotation <strong>cannot be edited anymore</strong>. 
              You can then generate an invoice from this quotation. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={accepting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowAcceptDialog(false)
                handleAcceptQuotation()
              }}
              disabled={accepting}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              Yes, Accept
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

