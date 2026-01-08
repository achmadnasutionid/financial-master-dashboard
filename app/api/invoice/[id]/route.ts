import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logInvoiceToSheets, deleteInvoiceFromSheets } from "@/lib/google-sheets"

// GET single invoice
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const invoice = await prisma.invoice.findUnique({
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

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error("Error fetching invoice:", error)
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    )
  }
}

// PUT update invoice
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // If only status is provided, just update the status (for marking invoice as paid)
    if (body.status && Object.keys(body).length === 1) {
      const invoice = await prisma.invoice.update({
        where: { id },
        data: {
          status: body.status
        },
        include: {
          items: {
            include: {
              details: true
            }
          }
        }
      })
      
      // Log to Google Sheets if status is pending or paid
      // TEMPORARILY DISABLED for faster API performance
      // if (invoice.status === 'pending' || invoice.status === 'paid') {
      //   logInvoiceToSheets(invoice).catch(err =>
      //     console.error('Failed to log invoice to sheets:', err)
      //   )
      // }
      
      return NextResponse.json(invoice)
    }

    // Delete existing items and details
    await prisma.invoiceItem.deleteMany({
      where: { invoiceId: id }
    })

    // Delete existing remarks
    await prisma.invoiceRemark.deleteMany({
      where: { invoiceId: id }
    })

    const invoice = await prisma.invoice.update({
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

    // Log to Google Sheets if status is pending or paid (non-blocking)
    // TEMPORARILY DISABLED for faster API performance
    // if (invoice.status === 'pending' || invoice.status === 'paid') {
    //   logInvoiceToSheets(invoice).catch(err =>
    //     console.error('Failed to log invoice to sheets:', err)
    //   )
    // }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error("Error updating invoice:", error)
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    )
  }
}

// DELETE invoice
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get invoice data before deletion for Google Sheets logging
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: {
        invoiceId: true,
        productionDate: true,
      }
    });

    // Delete the invoice
    await prisma.invoice.delete({
      where: { id }
    })

    // Delete row from Google Sheets
    // TEMPORARILY DISABLED for faster API performance
    // if (invoice) {
    //   deleteInvoiceFromSheets(invoice.invoiceId, invoice.productionDate).catch(err =>
    //     console.error('Failed to delete invoice from sheets:', err)
    //   )
    // }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting invoice:", error)
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    )
  }
}

