"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { useFetch } from "@/hooks/use-fetch"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Download, MessageCircle, Copy } from "lucide-react"
import { useParams } from "next/navigation"
import { PDFDownloadLink, pdf } from "@react-pdf/renderer"
import { ExpensePDF } from "@/components/pdf/expense-pdf"
import { LazyPDFViewer } from "@/components/pdf/lazy-pdf-viewer"
import { toast } from "sonner"
import { Breadcrumb } from "@/components/ui/breadcrumb"

interface Expense {
  expenseId: string
  projectName: string
  productionDate: string
  clientBudget: number
  paidAmount: number
  totalItemBudgeted: number
  totalItemDifferences: number
  notes?: string
  status: string
  items: Array<{
    productName: string
    budgeted: number
    actual: number
    difference: number
  }>
  createdAt: string
  updatedAt: string
}

export default function ViewExpensePage() {
  const params = useParams()
  const expenseId = params?.id as string
  const [mounted, setMounted] = useState(false)

  // Use SWR for cached data fetching
  const { data: expense, isLoading: loading } = useFetch<Expense>(
    expenseId ? `/api/expense/${expenseId}` : null
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  if (loading || !mounted) {
    return (
      <div className="flex min-h-screen flex-col">
        <PageHeader title="View Expense" showBackButton={true} backTo="/expense" />
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

  if (!expense) {
    return (
      <div className="flex min-h-screen flex-col">
        <PageHeader title="View Expense" showBackButton={true} backTo="/expense" />
        <main className="flex flex-1 items-center justify-center">
          <p>Expense not found</p>
        </main>
        <Footer />
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const totalBudget = expense.clientBudget // From client budget field
  const totalPaid = expense.paidAmount // From paid amount field
  const totalActual = expense.items.reduce((sum, item) => sum + item.actual, 0)
  const totalDifference = totalPaid - totalActual // Paid - Actual

  // Handle WhatsApp share
  const handleWhatsApp = async () => {
    if (!expense) return

    try {
      // Generate and download the PDF
      const blob = await pdf(<ExpensePDF data={expense} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${expense.expenseId}_${expense.projectName.replace(/\s+/g, "_")}.pdf`
      link.click()
      URL.revokeObjectURL(url)

      // Open WhatsApp Web with pre-filled message
      const message = `Hi! Here's the expense report details:\n\n*${expense.expenseId}*\nProject: ${expense.projectName}\nClient Budget: ${formatCurrency(totalBudget)}\nPaid Amount: ${formatCurrency(totalPaid)}\nTotal Actual: ${formatCurrency(totalActual)}\nTotal Difference: ${formatCurrency(totalDifference)}\n\nI've attached the PDF document for your review.`

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

  // Handle copy expense
  const [copying, setCopying] = useState(false)
  const handleCopy = async () => {
    if (!expense || copying) return

    setCopying(true)
    try {
      const response = await fetch(`/api/expense/${expenseId}/copy`, {
        method: "POST",
      })

      if (response.ok) {
        const copiedExpense = await response.json()
        toast.success("Expense copied successfully", {
          description: "Redirecting to the copied expense..."
        })
        router.push(`/expense/${copiedExpense.id}/edit`)
      } else {
        const errorData = await response.json()
        toast.error("Failed to copy expense", {
          description: errorData.error || "An error occurred"
        })
      }
    } catch (error) {
      console.error("Error copying expense:", error)
      toast.error("Failed to copy expense")
    } finally {
      setCopying(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader title="View Expense" showBackButton={true} backTo="/expense" />
      <main className="flex flex-1 flex-col bg-gradient-to-br from-background via-background to-muted px-4 py-12">
        <div className="container mx-auto max-w-7xl space-y-6">
          <Breadcrumb items={[
            { label: "Expenses", href: "/expense" },
            { label: expense?.expenseId || expenseId }
          ]} />
          {/* Header with download button */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {expense.expenseId} - {expense.projectName}
              </h2>
              <p className="text-sm text-muted-foreground">
                Status: {expense.status.toUpperCase()} | Total Difference: {" "}
                <span className={totalDifference >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatCurrency(totalDifference)}
                </span>
              </p>
            </div>
            {expense.status === "final" && (
              <div className="flex gap-2">
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
                  document={<ExpensePDF data={expense} />}
                  fileName={`${expense.expenseId}_${expense.projectName.replace(
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
              <ExpensePDF data={expense} />
            </LazyPDFViewer>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

