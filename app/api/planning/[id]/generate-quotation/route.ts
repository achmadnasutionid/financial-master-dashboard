import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST - Generate quotation from planning
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Fetch the planning
    const planning = await prisma.planning.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!planning) {
      return NextResponse.json(
        { error: "Planning not found" },
        { status: 404 }
      )
    }

    // Check if planning is finalized
    if (planning.status !== "final") {
      return NextResponse.json(
        { error: "Only finalized planning can generate quotation" },
        { status: 400 }
      )
    }

    // Check if quotation already exists
    if (planning.generatedQuotationId) {
      const existingQuotation = await prisma.quotation.findUnique({
        where: { id: planning.generatedQuotationId },
        include: {
          items: {
            include: {
              details: true
            }
          },
          remarks: true
        }
      })
      
      if (existingQuotation) {
        return NextResponse.json(existingQuotation, { status: 200 })
      }
    }

    // Get request body for company, billing, signature, and pph
    const body = await request.json()
    const { companyId, billingId, signatureId, pph } = body

    if (!companyId || !billingId || !signatureId || pph === undefined) {
      return NextResponse.json(
        { error: "Company, billing, signature, and PPh are required" },
        { status: 400 }
      )
    }

    // Fetch master data
    const company = await prisma.company.findUnique({ where: { id: companyId } })
    const billing = await prisma.billing.findUnique({ where: { id: billingId } })
    const signature = await prisma.signature.findUnique({ where: { id: signatureId } })

    if (!company || !billing || !signature) {
      console.error("Master data not found:", { company: !!company, billing: !!billing, signature: !!signature })
      return NextResponse.json(
        { error: "Company, billing, or signature not found" },
        { status: 404 }
      )
    }

    // Generate Quotation ID
    const year = new Date().getFullYear()
    const lastQuotation = await prisma.quotation.findFirst({
      where: {
        quotationId: {
          startsWith: `QTN-${year}-`
        }
      },
      orderBy: {
        quotationId: "desc"
      }
    })

    let newNumber = 1
    if (lastQuotation) {
      const lastNumber = parseInt(lastQuotation.quotationId.split("-")[2])
      newNumber = lastNumber + 1
    }

    const quotationId = `QTN-${year}-${newNumber.toString().padStart(4, "0")}`

    // Calculate total amount
    const subtotal = planning.items.reduce((sum, item) => sum + item.budget, 0)
    const pphAmount = subtotal * (parseFloat(pph) / 100)
    const totalAmount = subtotal - pphAmount

    // Create quotation with items
    const quotation = await prisma.quotation.create({
      data: {
        quotationId,
        companyName: company.name,
        companyAddress: company.address,
        companyCity: company.city,
        companyProvince: company.province,
        companyPostalCode: company.postalCode,
        companyTelp: company.telp,
        companyEmail: company.email,
        productionDate: new Date(),
        billTo: `${planning.clientName} - ${planning.projectName}`,
        notes: planning.notes,
        billingName: billing.name,
        billingBankName: billing.bankName,
        billingBankAccount: billing.bankAccount,
        billingBankAccountName: billing.bankAccountName,
        billingKtp: billing.ktp,
        billingNpwp: billing.npwp,
        signatureName: signature.name,
        signatureImageData: signature.imageData,
        pph,
        totalAmount,
        status: "draft",
        items: {
          create: planning.items.map((item) => ({
            productName: item.productName,
            total: item.budget,
            details: {
              create: [
                {
                  detail: "", // Empty detail as per requirement
                  unitPrice: item.budget,
                  qty: 1,
                  amount: item.budget
                }
              ]
            }
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

    // Update planning with generated quotation ID
    await prisma.planning.update({
      where: { id },
      data: { generatedQuotationId: quotation.id }
    })

    return NextResponse.json(quotation, { status: 201 })
  } catch (error) {
    console.error("Error generating quotation:", error)
    return NextResponse.json(
      { error: "Failed to generate quotation" },
      { status: 500 }
    )
  }
}

