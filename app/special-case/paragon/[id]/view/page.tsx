"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { useFetch } from "@/hooks/use-fetch"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { PDFDownloadLink, pdf } from "@react-pdf/renderer"
import { LazyPDFViewer } from "@/components/pdf/lazy-pdf-viewer"
import { Download, MessageCircle, FileText, Receipt, ClipboardCheck, CheckCircle, Upload, Copy } from "lucide-react"
import { ParagonQuotationPDF } from "@/components/pdf/paragon-quotation-pdf"
import { ParagonInvoicePDF } from "@/components/pdf/paragon-invoice-pdf"
import { ParagonBASTPDF } from "@/components/pdf/paragon-bast-pdf"
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

interface ParagonTicket {
  id: string
  ticketId: string
  quotationId: string
  invoiceId: string
  companyName: string
  companyAddress: string
  companyCity: string
  companyProvince: string
  companyPostalCode?: string
  companyTelp?: string
  companyEmail?: string
  productionDate: string
  quotationDate: string
  invoiceBastDate: string
  billTo: string
  contactPerson: string
  contactPosition: string
  signatureName: string
  signatureRole?: string
  signatureImageData: string
  finalWorkImageData?: string
  pph: string
  totalAmount: number
  status: string
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

type ViewType = 'quotation' | 'invoice' | 'bast'

export default function ViewParagonTicketPage() {
  const params = useParams()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [viewType, setViewType] = useState<ViewType>('quotation')
  const [finalizing, setFinalizing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false)

  // Use SWR for cached data fetching
  const { data: ticket, isLoading: loading, mutate } = useFetch<ParagonTicket>(
    params.id ? `/api/paragon/${params.id}` : null
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleWhatsApp = async () => {
    if (!ticket) return

    try {
      // Generate the correct PDF based on view type
      let pdfComponent
      if (viewType === 'quotation') {
        pdfComponent = <ParagonQuotationPDF data={ticket} />
      } else if (viewType === 'invoice') {
        pdfComponent = <ParagonInvoicePDF data={ticket} />
      } else if (viewType === 'bast') {
        pdfComponent = <ParagonBASTPDF data={ticket} />
      } else {
        toast.error("Invalid view type")
        return
      }

      // Generate and download the PDF
      const blob = await pdf(pdfComponent).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${ticket.ticketId}_${viewType}_${ticket.billTo.replace(/\s+/g, "_")}.pdf`
      link.click()
      URL.revokeObjectURL(url)

      // Open WhatsApp Web with pre-filled message
      const message = `Hi! Here's the Paragon Ticket ${viewType} details:\n\n*${ticket.ticketId}*\nClient: ${ticket.billTo}\nContact: ${ticket.contactPerson} (${ticket.contactPosition})\nTotal Amount: ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(ticket.totalAmount)}\n\nI've attached the PDF document for your review.`

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

  const handleFinalize = async () => {
    if (!ticket || finalizing) return
    
    setFinalizing(true)
    try {
      const response = await fetch(`/api/paragon/${ticket.id}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        const data = await response.json()
        toast.success("Ticket finalized and draft expense created!", {
          description: `Expense ${data.expense.expenseId} has been created.`
        })
        // Redirect to list page
        router.push("/special-case/paragon?refresh=true")
      } else {
        const errorData = await response.json()
        toast.error("Failed to finalize ticket", {
          description: errorData.error || "An error occurred"
        })
      }
    } catch (error) {
      console.error("Error finalizing ticket:", error)
      toast.error("Failed to finalize ticket")
    } finally {
      setFinalizing(false)
    }
  }

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!ticket) return
    
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const imageData = reader.result as string

        const response = await fetch(`/api/paragon/${ticket.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ finalWorkImageData: imageData }),
        })

        if (response.ok) {
          const updatedTicket = await response.json()
          mutate()
          toast.success("Screenshot uploaded successfully!")
        } else {
          toast.error("Failed to upload screenshot")
        }
        setUploading(false)
      }
      reader.onerror = () => {
        toast.error("Failed to read file")
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error("Error uploading screenshot:", error)
      toast.error("Failed to upload screenshot")
      setUploading(false)
    }
  }

  if (loading || !mounted) {
    return (
      <div className="flex min-h-screen flex-col">
        <PageHeader title="View Paragon Ticket" showBackButton={true} backTo="/special-case/paragon" />
        <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
          <div className="container mx-auto max-w-7xl space-y-6">
            <div className="space-y-4">
              <div className="h-7 w-72 animate-pulse rounded bg-muted" />
              <div className="flex gap-2">
                <div className="h-9 w-28 animate-pulse rounded bg-muted" />
                <div className="h-9 w-28 animate-pulse rounded bg-muted" />
                <div className="h-9 w-28 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="h-[calc(100vh-300px)] w-full animate-pulse rounded-lg bg-muted" />
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="flex min-h-screen flex-col">
        <PageHeader title="View Paragon Ticket" showBackButton={true} backTo="/special-case/paragon" />
        <main className="flex flex-1 items-center justify-center">
          <p>Ticket not found</p>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader title="View Paragon Ticket" showBackButton={true} backTo="/special-case/paragon" />
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
        <div className="container mx-auto max-w-7xl space-y-6">
          <Breadcrumb items={[
            { label: "Paragon Tickets", href: "/special-case/paragon" },
            { label: ticket?.ticketId || (params.id as string) }
          ]} />
          {/* Header with ID and company name */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {ticket.ticketId} - {ticket.billTo}
              </h2>
            </div>
            
            {/* View Type Switcher - Below the header */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewType === 'quotation' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewType('quotation')}
              >
                <FileText className="mr-2 h-4 w-4" />
                Quotation
              </Button>
              <Button
                variant={viewType === 'invoice' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewType('invoice')}
              >
                <Receipt className="mr-2 h-4 w-4" />
                Invoice
              </Button>
              <Button
                variant={viewType === 'bast' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewType('bast')}
              >
                <ClipboardCheck className="mr-2 h-4 w-4" />
                BAST
              </Button>
            </div>
          </div>

          {/* Action buttons for current view */}
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Actions for: <span className="font-semibold">{viewType === 'quotation' ? 'Quotation' : viewType === 'invoice' ? 'Invoice' : 'BAST'}</span>
            </p>
            
            <div className="flex flex-wrap gap-2">
              {/* Upload Screenshot Button - Only show on BAST view if status is draft */}
              {viewType === 'bast' && ticket.status === 'draft' && (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotUpload}
                    className="hidden"
                    id="screenshotUpload"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('screenshotUpload')?.click()}
                    disabled={uploading}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? "Uploading..." : "Upload Screenshot"}
                  </Button>
                </>
              )}
              
              {/* Finalize Button - Only show on BAST view if status is draft */}
              {viewType === 'bast' && ticket.status === 'draft' && (
                <Button
                  onClick={() => setShowFinalizeDialog(true)}
                  disabled={finalizing}
                  size="sm"
                  variant="default"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {finalizing ? "Finalizing..." : "Finalize Ticket"}
                </Button>
              )}
              
              {/* Action Buttons */}
<Button
                variant="outline"
                size="sm"
                onClick={handleWhatsApp}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp
              </Button>

              {viewType === 'quotation' && (
                <PDFDownloadLink
                  document={<ParagonQuotationPDF data={ticket} />}
                  fileName={`${ticket.ticketId}_quotation_${ticket.billTo.replace(/\s+/g, "_")}.pdf`}
                >
                  {({ loading: pdfLoading }) => (
                    <Button size="sm" disabled={pdfLoading}>
                      <Download className="mr-2 h-4 w-4" />
                      {pdfLoading ? "Preparing..." : "Download PDF"}
                    </Button>
                  )}
                </PDFDownloadLink>
              )}
              
              {viewType === 'invoice' && (
                <PDFDownloadLink
                  document={<ParagonInvoicePDF data={ticket} />}
                  fileName={`${ticket.ticketId}_invoice_${ticket.billTo.replace(/\s+/g, "_")}.pdf`}
                >
                  {({ loading: pdfLoading }) => (
                    <Button size="sm" disabled={pdfLoading}>
                      <Download className="mr-2 h-4 w-4" />
                      {pdfLoading ? "Preparing..." : "Download PDF"}
                    </Button>
                  )}
                </PDFDownloadLink>
              )}
              
              {viewType === 'bast' && (
                <PDFDownloadLink
                  document={<ParagonBASTPDF data={ticket} />}
                  fileName={`${ticket.ticketId}_bast_${ticket.billTo.replace(/\s+/g, "_")}.pdf`}
                >
                  {({ loading: pdfLoading }) => (
                    <Button size="sm" disabled={pdfLoading}>
                      <Download className="mr-2 h-4 w-4" />
                      {pdfLoading ? "Preparing..." : "Download PDF"}
                    </Button>
                  )}
                </PDFDownloadLink>
              )}
            </div>
          </div>

          {/* PDF Viewer */}
          {viewType === 'quotation' && (
            <div className="h-[calc(100vh-250px)] w-full overflow-hidden rounded-lg border bg-white shadow-lg">
              <LazyPDFViewer
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                }}
                showToolbar={true}
              >
                <ParagonQuotationPDF data={ticket} />
              </LazyPDFViewer>
            </div>
          )}

          {viewType === 'invoice' && (
            <div className="h-[calc(100vh-250px)] w-full overflow-hidden rounded-lg border bg-white shadow-lg">
              <LazyPDFViewer
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                }}
                showToolbar={true}
              >
                <ParagonInvoicePDF data={ticket} />
              </LazyPDFViewer>
            </div>
          )}

          {viewType === 'bast' && (
            <div className="h-[calc(100vh-250px)] w-full overflow-hidden rounded-lg border bg-white shadow-lg">
              <LazyPDFViewer
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                }}
                showToolbar={true}
              >
                <ParagonBASTPDF data={ticket} />
              </LazyPDFViewer>
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Finalize Confirmation Dialog */}
      <AlertDialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize Ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              Once finalized, this ticket <strong>cannot be edited anymore</strong>. 
              A draft expense will be created automatically. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={finalizing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowFinalizeDialog(false)
                handleFinalize()
              }}
              disabled={finalizing}
            >
              Yes, Finalize
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
