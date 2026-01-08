import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Helper function to generate Paragon ID in format PRG-YYYY-NNNN
async function generateParagonId() {
  const year = new Date().getFullYear()
  const prefix = `PRG-${year}-`
  
  const lastParagon = await prisma.paragonTicket.findFirst({
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
  if (lastParagon) {
    const lastNumber = parseInt(lastParagon.ticketId.split("-")[2])
    nextNumber = lastNumber + 1
  }

  return `${prefix}${nextNumber.toString().padStart(4, "0")}`
}

// POST copy paragon ticket
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get the original paragon ticket with all related data
    const originalParagon = await prisma.paragonTicket.findUnique({
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

    if (!originalParagon) {
      return NextResponse.json(
        { error: "Paragon ticket not found" },
        { status: 404 }
      )
    }

    // Generate new paragon ID
    const newParagonId = await generateParagonId()

    // Create a copy with "- Copy" appended to billTo
    const copiedParagon = await prisma.paragonTicket.create({
      data: {
        ticketId: newParagonId,
        companyName: originalParagon.companyName,
        companyAddress: originalParagon.companyAddress,
        companyCity: originalParagon.companyCity,
        companyProvince: originalParagon.companyProvince,
        companyTelp: originalParagon.companyTelp,
        companyEmail: originalParagon.companyEmail,
        productionDate: originalParagon.productionDate,
        quotationDate: originalParagon.quotationDate,
        invoiceBastDate: originalParagon.invoiceBastDate,
        billTo: `${originalParagon.billTo} - Copy`,
        contactPerson: originalParagon.contactPerson,
        contactPosition: originalParagon.contactPosition,
        signatureName: originalParagon.signatureName,
        signatureRole: originalParagon.signatureRole,
        signatureImageData: originalParagon.signatureImageData,
        finalWorkImageData: originalParagon.finalWorkImageData,
        pph: originalParagon.pph,
        totalAmount: originalParagon.totalAmount,
        status: "draft", // Always create copy as draft
        items: {
          create: originalParagon.items.map(item => ({
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
          create: originalParagon.remarks.map(remark => ({
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

    return NextResponse.json(copiedParagon, { status: 201 })
  } catch (error) {
    console.error("Error copying paragon ticket:", error)
    return NextResponse.json(
      { error: "Failed to copy paragon ticket" },
      { status: 500 }
    )
  }
}
