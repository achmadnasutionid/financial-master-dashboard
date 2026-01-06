"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { useFetch } from "@/hooks/use-fetch"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { PDFDownloadLink } from "@react-pdf/renderer"
import { LazyPDFViewer } from "@/components/pdf/lazy-pdf-viewer"
import { FileText, Receipt, ClipboardCheck, CheckCircle, Upload, Download } from "lucide-react"
import { ErhaQuotationPDF } from "@/components/pdf/erha-quotation-pdf"
import { ErhaInvoicePDF } from "@/components/pdf/erha-invoice-pdf"
import { ErhaBASTPDF } from "@/components/pdf/erha-bast-pdf"
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

interface ErhaTicket {
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
  billToAddress: string
  contactPerson: string
  contactPosition: string
  billingName: string
  billingBankName: string
  billingBankAccount: string
  billingBankAccountName: string
  billingKtp?: string
  billingNpwp?: string
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

export default function ViewErhaTicketPage() {
  const params = useParams()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [viewType, setViewType] = useState<ViewType>('quotation')
  const [finalizing, setFinalizing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false)

  // Use SWR for cached data fetching
  const { data: ticket, isLoading: loading, mutate } = useFetch<ErhaTicket>(
    params.id ? `/api/erha/${params.id}` : null
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleFinalize = async () => {
    if (!ticket || finalizing) return
    
    setFinalizing(true)
    try {
      const response = await fetch(`/api/erha/${ticket.id}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        const data = await response.json()
        toast.success("Ticket finalized and draft expense created!", {
          description: `Expense ${data.expense.expenseId} has been created.`
        })
        // Redirect to list page
        router.push("/special-case/erha?refresh=true")
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

        const response = await fetch(`/api/erha/${ticket.id}`, {
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
        <PageHeader title="View Erha Ticket" showBackButton={true} backTo="/special-case/erha" />
        <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
          <div className="container mx-auto max-w-7xl space-y-6">
            <div className="space-y-4">
              <div className="h-7 w-64 animate-pulse rounded bg-muted" />
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
        <PageHeader title="View Erha Ticket" showBackButton={true} backTo="/special-case/erha" />
        <main className="flex flex-1 items-center justify-center">
          <p>Ticket not found</p>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader title="View Erha Ticket" showBackButton={true} backTo="/special-case/erha" />
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
        <div className="container mx-auto max-w-7xl space-y-6">
          <Breadcrumb items={[
            { label: "Erha Tickets", href: "/special-case/erha" },
            { label: ticket?.ticketId || (params.id as string) }
          ]} />
          {/* Header with ID and company name */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {ticket.ticketId} - {ticket.billTo}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Status: <span className="font-semibold">{ticket.status.toUpperCase()}</span>
              </p>
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
              Viewing: <span className="font-semibold">{viewType === 'quotation' ? 'Quotation' : viewType === 'invoice' ? 'Invoice' : 'BAST'}</span>
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
              
              {/* Download Button for Quotation */}
              {viewType === 'quotation' && (
                <PDFDownloadLink
                  document={<ErhaQuotationPDF data={ticket} />}
                  fileName={`${ticket.quotationId}_quotation_${ticket.billTo.replace(/\s+/g, "_")}.pdf`}
                >
                  {({ loading: pdfLoading }) => (
                    <Button size="sm" disabled={pdfLoading}>
                      <Download className="mr-2 h-4 w-4" />
                      {pdfLoading ? "Preparing..." : "Download PDF"}
                    </Button>
                  )}
                </PDFDownloadLink>
              )}
              
              {/* Download Button for Invoice */}
              {viewType === 'invoice' && (
                <PDFDownloadLink
                  document={<ErhaInvoicePDF data={ticket} />}
                  fileName={`${ticket.invoiceId}_invoice_${ticket.billTo.replace(/\s+/g, "_")}.pdf`}
                >
                  {({ loading: pdfLoading }) => (
                    <Button size="sm" disabled={pdfLoading}>
                      <Download className="mr-2 h-4 w-4" />
                      {pdfLoading ? "Preparing..." : "Download PDF"}
                    </Button>
                  )}
                </PDFDownloadLink>
              )}
              
              {/* Download Button for BAST */}
              {viewType === 'bast' && (
                <PDFDownloadLink
                  document={<ErhaBASTPDF data={ticket} />}
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

          {/* PDF Viewer for Quotation */}
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
                <ErhaQuotationPDF data={ticket} />
              </LazyPDFViewer>
            </div>
          )}

          {/* PDF Viewer for Invoice */}
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
                <ErhaInvoicePDF data={ticket} />
              </LazyPDFViewer>
            </div>
          )}

          {/* PDF Viewer for BAST */}
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
                <ErhaBASTPDF data={ticket} />
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
