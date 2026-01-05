import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET single planning by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const planning = await prisma.planning.findUnique({
      where: { id },
      include: {
        items: true
      }
    })

    if (!planning) {
      return NextResponse.json(
        { error: "Planning not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(planning)
  } catch (error) {
    console.error("Error fetching planning:", error)
    return NextResponse.json(
      { error: "Failed to fetch planning" },
      { status: 500 }
    )
  }
}

// PUT update planning
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { projectName, clientName, clientBudget, notes, items, status } = body

    // Validate required fields
    if (!projectName || !clientName || clientBudget === undefined) {
      return NextResponse.json(
        { error: "Project name, client name, and client budget are required" },
        { status: 400 }
      )
    }

    // Delete existing items and create new ones
    await prisma.planningItem.deleteMany({
      where: { planningId: id }
    })

    const planning = await prisma.planning.update({
      where: { id },
      data: {
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

    return NextResponse.json(planning)
  } catch (error) {
    console.error("Error updating planning:", error)
    return NextResponse.json(
      { error: "Failed to update planning" },
      { status: 500 }
    )
  }
}

// DELETE planning
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.planning.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting planning:", error)
    return NextResponse.json(
      { error: "Failed to delete planning" },
      { status: 500 }
    )
  }
}

