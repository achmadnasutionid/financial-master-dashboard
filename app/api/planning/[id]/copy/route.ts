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
        items: true
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
        clientName: originalPlanning.clientName,
        clientBudget: originalPlanning.clientBudget,
        notes: originalPlanning.notes,
        status: "draft", // Always create copy as draft
        items: {
          create: originalPlanning.items.map(item => ({
            productName: item.productName,
            budget: item.budget,
            expense: item.expense
          }))
        }
      },
      include: {
        items: true
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
