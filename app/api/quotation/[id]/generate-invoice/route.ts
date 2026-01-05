import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST - Generate invoice from quotation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Fetch the quotation
    const quotation = await prisma.quotation.findUnique({
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

    if (!quotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      )
    }

    // Check if quotation is accepted
    if (quotation.status !== "accepted") {
      return NextResponse.json(
        { error: "Only accepted quotations can generate invoice" },
        { status: 400 }
      )
    }

    // Check if invoice already exists
    if (quotation.generatedInvoiceId) {
      return NextResponse.json(
        { invoiceId: quotation.generatedInvoiceId },
        { status: 200 }
      )
    }

    // Generate Invoice ID
    const year = new Date().getFullYear()
    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        invoiceId: {
          startsWith: `INV-${year}-`
        }
      },
      orderBy: {
        invoiceId: "desc"
      }
    })

    let newNumber = 1
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.invoiceId.split("-")[2])
      newNumber = lastNumber + 1
    }

    const invoiceId = `INV-${year}-${newNumber.toString().padStart(4, "0")}`

    // Get planning ID if quotation came from planning
    let planningId = null
    const planning = await prisma.planning.findFirst({
      where: { generatedQuotationId: id }
    })
    if (planning) {
      planningId = planning.id
    }

    // Create invoice by copying all quotation data
    const invoice = await prisma.invoice.create({
      data: {
        invoiceId,
        planningId, // Save reference to original planning
        companyName: quotation.companyName,
        companyAddress: quotation.companyAddress,
        companyCity: quotation.companyCity,
        companyProvince: quotation.companyProvince,
        companyPostalCode: quotation.companyPostalCode,
        companyTelp: quotation.companyTelp,
        companyEmail: quotation.companyEmail,
        productionDate: quotation.productionDate,
        billTo: quotation.billTo,
        notes: quotation.notes,
        billingName: quotation.billingName,
        billingBankName: quotation.billingBankName,
        billingBankAccount: quotation.billingBankAccount,
        billingBankAccountName: quotation.billingBankAccountName,
        billingKtp: quotation.billingKtp,
        billingNpwp: quotation.billingNpwp,
        signatureName: quotation.signatureName,
        signatureRole: quotation.signatureRole,
        signatureImageData: quotation.signatureImageData,
        pph: quotation.pph,
        totalAmount: quotation.totalAmount,
        status: "draft",
        items: {
          create: quotation.items.map((item) => ({
            productName: item.productName,
            total: item.total,
            details: {
              create: item.details.map((detail) => ({
                detail: detail.detail,
                unitPrice: detail.unitPrice,
                qty: detail.qty,
                amount: detail.amount
              }))
            }
          }))
        },
        remarks: {
          create: quotation.remarks.map((remark) => ({
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

    // Update quotation with generated invoice ID
    await prisma.quotation.update({
      where: { id },
      data: { generatedInvoiceId: invoice.id }
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error("Error generating invoice:", error)
    return NextResponse.json(
      { error: "Failed to generate invoice" },
      { status: 500 }
    )
  }
}

