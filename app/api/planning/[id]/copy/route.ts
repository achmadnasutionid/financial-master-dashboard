import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Helper function to generate Planning ID in format PLN-YYYY-NNNN
async function generatePlanningId() {
  const year = new Date().getFullYear()
  const prefix = `PLN-${year}-`
  
  const lastPlanning = await prisma.planning.findFirst({
    where: {
      planningId: {
        startsWith: prefix
      }
    },
    orderBy: {
      planningId: "desc"
    }
  })

  let nextNumber = 1
  if (lastPlanning) {
    const lastNumber = parseInt(lastPlanning.planningId.split("-")[2])
    nextNumber = lastNumber + 1
  }

  return `${prefix}${nextNumber.toString().padStart(4, "0")}`
}

// POST copy planning
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get the original planning with all related data
    const originalPlanning = await prisma.planning.findUnique({
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

    if (!originalPlanning) {
      return NextResponse.json(
        { error: "Planning not found" },
        { status: 404 }
      )
    }

    // Generate new planning ID
    const newPlanningId = await generatePlanningId()

    // Create a copy with "- Copy" appended to project name
    const copiedPlanning = await prisma.planning.create({
      data: {
        planningId: newPlanningId,
        projectName: `${originalPlanning.projectName} - Copy`,
        companyName: originalPlanning.companyName,
        companyAddress: originalPlanning.companyAddress,
        companyCity: originalPlanning.companyCity,
        companyProvince: originalPlanning.companyProvince,
        companyTelp: originalPlanning.companyTelp,
        companyEmail: originalPlanning.companyEmail,
        productionDate: originalPlanning.productionDate,
        billTo: originalPlanning.billTo,
        notes: originalPlanning.notes,
        billingName: originalPlanning.billingName,
        billingBankName: originalPlanning.billingBankName,
        billingBankAccount: originalPlanning.billingBankAccount,
        billingBankAccountName: originalPlanning.billingBankAccountName,
        billingKtp: originalPlanning.billingKtp,
        billingNpwp: originalPlanning.billingNpwp,
        signatureName: originalPlanning.signatureName,
        signatureRole: originalPlanning.signatureRole,
        signatureImageData: originalPlanning.signatureImageData,
        pph: originalPlanning.pph,
        totalAmount: originalPlanning.totalAmount,
        status: "draft", // Always create copy as draft
        items: {
          create: originalPlanning.items.map(item => ({
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
          create: originalPlanning.remarks.map(remark => ({
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

    return NextResponse.json(copiedPlanning, { status: 201 })
  } catch (error) {
    console.error("Error copying planning:", error)
    return NextResponse.json(
      { error: "Failed to copy planning" },
      { status: 500 }
    )
  }
}
