import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Helper function to generate Quotation ID in format QTN-YYYY-NNNN
async function generateQuotationId() {
  const year = new Date().getFullYear()
  const prefix = `QTN-${year}-`
  
  const lastQuotation = await prisma.quotation.findFirst({
    where: {
      quotationId: {
        startsWith: prefix
      }
    },
    orderBy: {
      quotationId: "desc"
    }
  })

  let nextNumber = 1
  if (lastQuotation) {
    const lastNumber = parseInt(lastQuotation.quotationId.split("-")[2])
    nextNumber = lastNumber + 1
  }

  return `${prefix}${nextNumber.toString().padStart(4, "0")}`
}

// POST copy quotation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get the original quotation with all related data
    const originalQuotation = await prisma.quotation.findUnique({
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

    if (!originalQuotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      )
    }

    // Generate new quotation ID
    const newQuotationId = await generateQuotationId()

    // Create a copy with "- Copy" appended to billTo
    const copiedQuotation = await prisma.quotation.create({
      data: {
        quotationId: newQuotationId,
        companyName: originalQuotation.companyName,
        companyAddress: originalQuotation.companyAddress,
        companyCity: originalQuotation.companyCity,
        companyProvince: originalQuotation.companyProvince,
        companyTelp: originalQuotation.companyTelp,
        companyEmail: originalQuotation.companyEmail,
        productionDate: originalQuotation.productionDate,
        billTo: `${originalQuotation.billTo} - Copy`,
        notes: originalQuotation.notes,
        billingName: originalQuotation.billingName,
        billingBankName: originalQuotation.billingBankName,
        billingBankAccount: originalQuotation.billingBankAccount,
        billingBankAccountName: originalQuotation.billingBankAccountName,
        billingKtp: originalQuotation.billingKtp,
        billingNpwp: originalQuotation.billingNpwp,
        signatureName: originalQuotation.signatureName,
        signatureRole: originalQuotation.signatureRole,
        signatureImageData: originalQuotation.signatureImageData,
        pph: originalQuotation.pph,
        totalAmount: originalQuotation.totalAmount,
        status: "draft", // Always create copy as draft
        items: {
          create: originalQuotation.items.map(item => ({
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
          create: originalQuotation.remarks.map(remark => ({
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

    return NextResponse.json(copiedQuotation, { status: 201 })
  } catch (error) {
    console.error("Error copying quotation:", error)
    return NextResponse.json(
      { error: "Failed to copy quotation" },
      { status: 500 }
    )
  }
}
