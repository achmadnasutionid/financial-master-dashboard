import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET single paragon ticket
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ticket = await prisma.paragonTicket.findUnique({
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

    if (!ticket) {
      return NextResponse.json(
        { error: "Paragon ticket not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(ticket)
  } catch (error) {
    console.error("Error fetching paragon ticket:", error)
    return NextResponse.json(
      { error: "Failed to fetch paragon ticket" },
      { status: 500 }
    )
  }
}

// PUT update paragon ticket
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // If only status is provided, just update the status
    if (body.status && Object.keys(body).length === 1) {
      const ticket = await prisma.paragonTicket.update({
        where: { id },
        data: {
          status: body.status
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
      return NextResponse.json(ticket)
    }

    // If only finalWorkImageData is provided, just update the screenshot
    if (body.finalWorkImageData !== undefined && Object.keys(body).length === 1) {
      const ticket = await prisma.paragonTicket.update({
        where: { id },
        data: {
          finalWorkImageData: body.finalWorkImageData
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
      return NextResponse.json(ticket)
    }

    // Otherwise, do full update
    // Delete existing items and remarks
    await prisma.paragonTicketItem.deleteMany({
      where: { ticketId: id }
    })
    await prisma.paragonTicketRemark.deleteMany({
      where: { ticketId: id }
    })

    // Update ticket with new data
    const ticket = await prisma.paragonTicket.update({
      where: { id },
      data: {
        companyName: body.companyName,
        companyAddress: body.companyAddress,
        companyCity: body.companyCity,
        companyProvince: body.companyProvince,
        companyPostalCode: body.companyPostalCode || null,
        companyTelp: body.companyTelp || null,
        companyEmail: body.companyEmail || null,
        productionDate: new Date(body.productionDate),
        quotationDate: new Date(body.quotationDate),
        invoiceBastDate: new Date(body.invoiceBastDate),
        billTo: body.billTo,
        contactPerson: body.contactPerson,
        contactPosition: body.contactPosition,
        signatureName: body.signatureName,
        signatureRole: body.signatureRole || null,
        signatureImageData: body.signatureImageData,
        finalWorkImageData: body.finalWorkImageData || null,
        pph: body.pph,
        totalAmount: parseFloat(body.totalAmount),
        status: body.status,
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
              }))
            }
          }))
        },
        remarks: {
          create: body.remarks?.map((remark: any) => ({
            text: remark.text,
            isCompleted: remark.isCompleted || false
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

    return NextResponse.json(ticket)
  } catch (error) {
    console.error("Error updating paragon ticket:", error)
    return NextResponse.json(
      { error: "Failed to update paragon ticket" },
      { status: 500 }
    )
  }
}

// DELETE paragon ticket
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.paragonTicket.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting paragon ticket:", error)
    return NextResponse.json(
      { error: "Failed to delete paragon ticket" },
      { status: 500 }
    )
  }
}

