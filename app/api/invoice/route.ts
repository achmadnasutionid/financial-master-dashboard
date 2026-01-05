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

// GET all invoices
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

    const invoices = await prisma.invoice.findMany({
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

    return NextResponse.json(invoices)
  } catch (error) {
    console.error("Error fetching invoices:", error)
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    )
  }
}

// POST create new invoice
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Generate unique invoice ID
    const invoiceId = await generateInvoiceId()

    // Create invoice with items and details
    const invoice = await prisma.invoice.create({
      data: {
        invoiceId,
        companyName: body.companyName,
        companyAddress: body.companyAddress,
        companyCity: body.companyCity,
        companyProvince: body.companyProvince,
        companyPostalCode: body.companyPostalCode || null,
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

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error("Error creating invoice:", error)
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    )
  }
}

