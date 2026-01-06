import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logQuotationToSheets } from "@/lib/google-sheets"

// GET single quotation
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    return NextResponse.json(quotation)
  } catch (error) {
    console.error("Error fetching quotation:", error)
    return NextResponse.json(
      { error: "Failed to fetch quotation" },
      { status: 500 }
    )
  }
}

// PUT update quotation
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // If only status is provided, just update the status (for accepting quotation)
    if (body.status && Object.keys(body).length === 1) {
      const quotation = await prisma.quotation.update({
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
      
      // Log status change to Google Sheets (only if pending or accepted)
      if (quotation.status === 'pending' || quotation.status === 'accepted') {
        logQuotationToSheets(quotation).catch(err =>
          console.error('Failed to log quotation status change to sheets:', err)
        )
      }
      
      return NextResponse.json(quotation)
    }

    // Delete existing items and details
    await prisma.quotationItem.deleteMany({
      where: { quotationId: id }
    })

    // Delete existing remarks
    await prisma.quotationRemark.deleteMany({
      where: { quotationId: id }
    })

    const quotation = await prisma.quotation.update({
      where: { id },
      data: {
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
    if (quotation.status === 'pending' || quotation.status === 'accepted') {
      logQuotationToSheets(quotation).catch(err =>
        console.error('Failed to log quotation update to sheets:', err)
      )
    }

    return NextResponse.json(quotation)
  } catch (error) {
    console.error("Error updating quotation:", error)
    return NextResponse.json(
      { error: "Failed to update quotation" },
      { status: 500 }
    )
  }
}

// DELETE quotation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get quotation data before deletion for Google Sheets logging
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      select: {
        quotationId: true,
        productionDate: true,
      }
    });

    // Delete the quotation
    await prisma.quotation.delete({
      where: { id }
    })

    // Delete row from Google Sheets
    if (quotation) {
      const { deleteQuotationFromSheets } = await import('@/lib/google-sheets');
      await deleteQuotationFromSheets(quotation.quotationId, quotation.productionDate);
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting quotation:", error)
    return NextResponse.json(
      { error: "Failed to delete quotation" },
      { status: 500 }
    )
  }
}

