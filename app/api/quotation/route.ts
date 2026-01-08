import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logQuotationToSheets } from "@/lib/google-sheets"

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

// GET all quotations
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const sortBy = searchParams.get("sortBy") || "newest"
    const includeDeleted = searchParams.get("includeDeleted") === "true"

    const where: any = {}
    if (status && status !== "all") {
      where.status = status
    }
    // Filter out soft-deleted records by default
    if (!includeDeleted) {
      where.deletedAt = null
    }

    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        items: {
          include: {
            details: true
          }
        },
        remarks: true
      },
      orderBy: {
        updatedAt: sortBy === "oldest" ? "asc" : "desc"
      }
    })

    return NextResponse.json(quotations)
  } catch (error) {
    console.error("Error fetching quotations:", error)
    return NextResponse.json(
      { error: "Failed to fetch quotations" },
      { status: 500 }
    )
  }
}

// POST create new quotation
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Generate unique quotation ID
    const quotationId = await generateQuotationId()

    // Create quotation with items and details
    const quotation = await prisma.quotation.create({
      data: {
        quotationId,
        companyName: body.companyName,
        companyAddress: body.companyAddress,
        companyCity: body.companyCity,
        companyProvince: body.companyProvince,
        companyTelp: body.companyTelp || null,
        companyEmail: body.companyEmail || null,
        productionDate: new Date(body.productionDate),
        billTo: body.billTo,
        notes: body.notes || null,
        billingName: body.billingName,
        billingBankName: body.billingBankName,
        billingBankAccount: body.billingBankAccount,
        billingBankAccountName: body.billingBankAccountName,
        billingKtp: body.billingKtp || null,
        billingNpwp: body.billingNpwp || null,
        signatureName: body.signatureName,
        signatureRole: body.signatureRole || null,
        signatureImageData: body.signatureImageData,
        pph: body.pph,
        totalAmount: parseFloat(body.totalAmount),
        status: body.status || "draft",
        items: {
          create: body.items?.map((item: any) => ({
            productName: item.productName,
            total: parseFloat(item.total),
            details: {
              create: item.details?.map((detail: any) => ({
                detail: detail.detail,
                unitPrice: parseFloat(detail.unitPrice),
                qty: parseFloat(detail.qty),
                amount: parseFloat(detail.amount)
              })) || []
            }
          })) || []
        },
        remarks: {
          create: body.remarks?.map((remark: any) => ({
            text: remark.text,
            isCompleted: remark.isCompleted || false
          })) || []
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

    // Log to Google Sheets if status is pending or accepted (non-blocking)
    // TEMPORARILY DISABLED for faster API performance
    // if (quotation.status === 'pending' || quotation.status === 'accepted') {
    //   logQuotationToSheets(quotation).catch(err =>
    //     console.error('Failed to log quotation to sheets:', err)
    //   )
    // }

    return NextResponse.json(quotation, { status: 201 })
  } catch (error) {
    console.error("Error creating quotation:", error)
    return NextResponse.json(
      { error: "Failed to create quotation" },
      { status: 500 }
    )
  }
}

