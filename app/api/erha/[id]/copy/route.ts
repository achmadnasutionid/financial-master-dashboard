import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Helper function to generate Erha ID in format ERH-YYYY-NNNN
async function generateErhaId() {
  const year = new Date().getFullYear()
  const prefix = `ERH-${year}-`
  
  const lastErha = await prisma.erhaTicket.findFirst({
    where: {
      ticketId: {
        startsWith: prefix
      }
    },
    orderBy: {
      ticketId: "desc"
    }
  })

  let nextNumber = 1
  if (lastErha) {
    const lastNumber = parseInt(lastErha.ticketId.split("-")[2])
    nextNumber = lastNumber + 1
  }

  return `${prefix}${nextNumber.toString().padStart(4, "0")}`
}

// POST copy erha ticket
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get the original erha ticket with all related data
    const originalErha = await prisma.erhaTicket.findUnique({
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

    if (!originalErha) {
      return NextResponse.json(
        { error: "Erha ticket not found" },
        { status: 404 }
      )
    }

    // Generate new erha ID
    const newErhaId = await generateErhaId()

    // Create a copy with "- Copy" appended to billTo
    const copiedErha = await prisma.erhaTicket.create({
      data: {
        ticketId: newErhaId,
        companyName: originalErha.companyName,
        companyAddress: originalErha.companyAddress,
        companyCity: originalErha.companyCity,
        companyProvince: originalErha.companyProvince,
        companyTelp: originalErha.companyTelp,
        companyEmail: originalErha.companyEmail,
        productionDate: originalErha.productionDate,
        quotationDate: originalErha.quotationDate,
        invoiceBastDate: originalErha.invoiceBastDate,
        billTo: `${originalErha.billTo} - Copy`,
        billToAddress: originalErha.billToAddress,
        contactPerson: originalErha.contactPerson,
        contactPosition: originalErha.contactPosition,
        billingName: originalErha.billingName,
        billingBankName: originalErha.billingBankName,
        billingBankAccount: originalErha.billingBankAccount,
        billingBankAccountName: originalErha.billingBankAccountName,
        billingKtp: originalErha.billingKtp,
        billingNpwp: originalErha.billingNpwp,
        signatureName: originalErha.signatureName,
        signatureRole: originalErha.signatureRole,
        signatureImageData: originalErha.signatureImageData,
        finalWorkImageData: originalErha.finalWorkImageData,
        pph: originalErha.pph,
        totalAmount: originalErha.totalAmount,
        status: "draft", // Always create copy as draft
        items: {
          create: originalErha.items.map(item => ({
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
          create: originalErha.remarks.map(remark => ({
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

    return NextResponse.json(copiedErha, { status: 201 })
  } catch (error) {
    console.error("Error copying erha ticket:", error)
    return NextResponse.json(
      { error: "Failed to copy erha ticket" },
      { status: 500 }
    )
  }
}
