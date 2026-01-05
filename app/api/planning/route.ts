import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Helper function to generate Planning ID in format PLN-YYYY-NNNN
async function generatePlanningId() {
  const year = new Date().getFullYear()
  const prefix = `PLN-${year}-`
  
  // Find the highest number for this year
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

// GET all plannings with optional filters
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

    const plannings = await prisma.planning.findMany({
      where,
      include: {
        items: true
      },
      orderBy: {
        updatedAt: sortBy === "oldest" ? "asc" : "desc"
      }
    })

    return NextResponse.json(plannings)
  } catch (error) {
    console.error("Error fetching plannings:", error)
    return NextResponse.json(
      { error: "Failed to fetch plannings" },
      { status: 500 }
    )
  }
}

// POST create new planning
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { projectName, clientName, clientBudget, notes, items, status } = body

    // Validate required fields
    if (!projectName || !clientName || clientBudget === undefined) {
      return NextResponse.json(
        { error: "Project name, client name, and client budget are required" },
        { status: 400 }
      )
    }

    // Generate unique planning ID
    const planningId = await generatePlanningId()

    // Create planning with items
    const planning = await prisma.planning.create({
      data: {
        planningId,
        projectName: projectName.trim(),
        clientName: clientName.trim(),
        clientBudget: parseFloat(clientBudget),
        notes: notes?.trim() || null,
        status: status || "draft",
        items: {
          create: items?.map((item: any) => ({
            productName: item.productName,
            budget: parseFloat(item.budget),
            expense: parseFloat(item.expense)
          })) || []
        }
      },
      include: {
        items: true
      }
    })

    return NextResponse.json(planning, { status: 201 })
  } catch (error) {
    console.error("Error creating planning:", error)
    return NextResponse.json(
      { error: "Failed to create planning" },
      { status: 500 }
    )
  }
}

