import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Helper function to generate Invoice ID in format INV-YYYY-NNNN
async function generateInvoiceId() {
  const year = new Date().getFullYear()
  const prefix = `INV-${year}-`
  
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceId: {
        startsWith: prefix
      }
    },
    orderBy: {
      invoiceId: "desc"
    }
  })

  let nextNumber = 1
  if (lastInvoice) {
    const lastNumber = parseInt(lastInvoice.invoiceId.split("-")[2])
    nextNumber = lastNumber + 1
  }

  return `${prefix}${nextNumber.toString().padStart(4, "0")}`
}

// POST copy invoice
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get the original invoice with all related data
    const originalInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            details: true
          }
        },
        remarks: true
      }
    })

    if (!originalInvoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      )
    }

    // Generate new invoice ID
    const newInvoiceId = await generateInvoiceId()

    // Create a copy with "- Copy" appended to billTo
    const copiedInvoice = await prisma.invoice.create({
      data: {
        invoiceId: newInvoiceId,
        companyName: originalInvoice.companyName,
        companyAddress: originalInvoice.companyAddress,
        companyCity: originalInvoice.companyCity,
        companyProvince: originalInvoice.companyProvince,
        companyPostalCode: originalInvoice.companyPostalCode,
        companyTelp: originalInvoice.companyTelp,
        companyEmail: originalInvoice.companyEmail,
        productionDate: originalInvoice.productionDate,
        billTo: `${originalInvoice.billTo} - Copy`,
        notes: originalInvoice.notes,
        billingName: originalInvoice.billingName,
        billingBankName: originalInvoice.billingBankName,
        billingBankAccount: originalInvoice.billingBankAccount,
        billingBankAccountName: originalInvoice.billingBankAccountName,
        billingKtp: originalInvoice.billingKtp,
        billingNpwp: originalInvoice.billingNpwp,
        signatureName: originalInvoice.signatureName,
        signatureRole: originalInvoice.signatureRole,
        signatureImageData: originalInvoice.signatureImageData,
        pph: originalInvoice.pph,
        totalAmount: originalInvoice.totalAmount,
        status: "draft", // Always create copy as draft
        items: {
          create: originalInvoice.items.map(item => ({
            productName: item.productName,
            total: item.total,
            details: {
              create: item.details.map(detail => ({
                detail: detail.detail,
                unitPrice: detail.unitPrice,
                qty: detail.qty,
                amount: detail.amount
              }))
            }
          }))
        },
        remarks: {
          create: originalInvoice.remarks.map(remark => ({
            text: remark.text,
            isCompleted: remark.isCompleted
          }))
        }
      },
      include: {
        items: {
          include: {
            details: true
          }
        },
        remarks: true
      }
    })

    return NextResponse.json(copiedInvoice, { status: 201 })
  } catch (error) {
    console.error("Error copying invoice:", error)
    return NextResponse.json(
      { error: "Failed to copy invoice" },
      { status: 500 }
    )
  }
}
