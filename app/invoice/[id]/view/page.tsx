"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { useFetch } from "@/hooks/use-fetch"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Download, MessageCircle, CheckCircle, FileText, Copy } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { PDFDownloadLink, pdf } from "@react-pdf/renderer"
import { InvoicePDF } from "@/components/pdf/invoice-pdf"
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

interface Invoice {
  invoiceId: string
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
  generatedExpenseId?: string
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

export default function ViewInvoicePage() {
  const params = useParams()
  const router = useRouter()
  const InvoiceId = params?.id as string
  const [mounted, setMounted] = useState(false)
  const [markingPaid, setMarkingPaid] = useState(false)
  const [showMarkPaidDialog, setShowMarkPaidDialog] = useState(false)

  // Use SWR for cached data fetching
  const { data: Invoice, isLoading: loading, mutate } = useFetch<Invoice>(
    InvoiceId ? `/api/invoice/${InvoiceId}` : null
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  // Open WhatsApp with Invoice details and download PDF
  const handleWhatsApp = async () => {
    if (!Invoice) return

    try {
      // Generate and download the PDF
      const blob = await pdf(<InvoicePDF data={Invoice} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${Invoice.invoiceId}_${Invoice.billTo.replace(/\s+/g, "_")}.pdf`
      link.click()
      URL.revokeObjectURL(url)

      // Open WhatsApp Web with pre-filled message
      const message = `Hi! Here's the Invoice details:\n\n*${Invoice.invoiceId}*\nClient: ${Invoice.billTo}\nTotal Amount: ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Invoice.totalAmount)}\n\nI've attached the PDF document for your review.`

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

  // Handle copy invoice
  const [copying, setCopying] = useState(false)
  const handleCopy = async () => {
    if (!Invoice || copying) return

    setCopying(true)
    try {
      const response = await fetch(`/api/invoice/${InvoiceId}/copy`, {
        method: "POST",
      })

      if (response.ok) {
        const copiedInvoice = await response.json()
        toast.success("Invoice copied successfully", {
          description: "Redirecting to the copied invoice..."
        })
        router.push(`/invoice/${copiedInvoice.id}/edit`)
      } else {
        const errorData = await response.json()
        toast.error("Failed to copy invoice", {
          description: errorData.error || "An error occurred"
        })
      }
    } catch (error) {
      console.error("Error copying invoice:", error)
      toast.error("Failed to copy invoice")
    } finally {
      setCopying(false)
    }
  }

  // Handle mark as paid
  const handleMarkAsPaid = async () => {
    if (!Invoice) return

    setMarkingPaid(true)
    try {
      // First, mark invoice as paid
      const response = await fetch(`/api/invoice/${InvoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" })
      })

      if (response.ok) {
        // Then create expense and redirect
        const expenseResponse = await fetch(`/api/invoice/${InvoiceId}/create-expense`, {
          method: "POST"
        })

        if (expenseResponse.ok) {
          const expense = await expenseResponse.json()
          toast.success("Invoice marked as paid!", {
            description: "Redirecting to expense form..."
          })
          // Redirect to expense edit page
          router.push(`/expense/${expense.id}/edit`)
        } else {
          toast.error("Failed to create expense", {
            description: "An error occurred while creating the expense."
          })
        }
      } else {
        const data = await response.json()
        toast.error("Failed to mark invoice as paid", {
          description: data.error || "An error occurred."
        })
      }
    } catch (error) {
      console.error("Error marking invoice as paid:", error)
      toast.error("Failed to mark invoice as paid", {
        description: "An unexpected error occurred."
      })
    } finally {
      setMarkingPaid(false)
    }
  }

  const handleViewExpense = async () => {
    if (!Invoice?.generatedExpenseId) return
    
    try {
      const response = await fetch(`/api/expense/${Invoice.generatedExpenseId}`)
      if (response.ok) {
        const expense = await response.json()
        // Navigate to edit if draft, view if final
        if (expense.status === "final") {
          router.push(`/expense/${Invoice.generatedExpenseId}/view`)
        } else {
          router.push(`/expense/${Invoice.generatedExpenseId}/edit`)
        }
      } else {
        toast.error("Failed to load expense")
      }
    } catch (error) {
      console.error("Error fetching expense:", error)
      toast.error("Failed to load expense")
    }
  }

  if (loading || !mounted) {
    return (
      <div className="flex min-h-screen flex-col">
        <PageHeader title="View Invoice" showBackButton={true} backTo="/invoice" />
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

  if (!Invoice) {
    return (
      <div className="flex min-h-screen flex-col">
        <PageHeader title="View Invoice" showBackButton={true} backTo="/invoice" />
        <main className="flex flex-1 items-center justify-center">
          <p>Invoice not found</p>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader title="View Invoice" showBackButton={true} backTo="/invoice" />
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
        <div className="container mx-auto max-w-7xl space-y-6">
          <Breadcrumb items={[
            { label: "Invoices", href: "/invoice" },
            { label: Invoice?.invoiceId || InvoiceId }
          ]} />
          {/* Header with download button */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {Invoice.invoiceId} - {Invoice.billTo}
              </h2>
              <p className="text-sm text-muted-foreground">
                Status: {Invoice.status.toUpperCase()}
              </p>
            </div>
            {Invoice.status !== "draft" && (
              <div className="flex gap-2">
                {Invoice.status === "pending" && (
                  <Button
                    onClick={() => setShowMarkPaidDialog(true)}
                    disabled={markingPaid}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {markingPaid ? "Marking..." : "Mark as Paid"}
                  </Button>
                )}
                {Invoice.status === "paid" && Invoice.generatedExpenseId && (
                  <Button
                    variant="outline"
                    onClick={handleViewExpense}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    View Expense
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleCopy}
                  disabled={copying}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  {copying ? "Copying..." : "Copy"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleWhatsApp}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp
                </Button>
                <PDFDownloadLink
                  document={<InvoicePDF data={Invoice} />}
                  fileName={`${Invoice.invoiceId}_${Invoice.billTo.replace(
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
              <InvoicePDF data={Invoice} />
            </LazyPDFViewer>
          </div>
        </div>
      </main>
      <Footer />

      {/* Mark as Paid Confirmation Dialog */}
      <AlertDialog open={showMarkPaidDialog} onOpenChange={setShowMarkPaidDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Invoice as Paid?</AlertDialogTitle>
            <AlertDialogDescription>
              Once marked as paid, this invoice <strong>cannot be edited anymore</strong>. 
              An expense record will be created automatically. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={markingPaid}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowMarkPaidDialog(false)
                handleMarkAsPaid()
              }}
              disabled={markingPaid}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              Yes, Mark as Paid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
