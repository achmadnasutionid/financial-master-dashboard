import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// POST restore soft-deleted gear expense
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const expense = await prisma.gearExpense.update({
      where: { id },
      data: { deletedAt: null },
    })

    return NextResponse.json(expense)
  } catch (error) {
    console.error("Error restoring gear expense:", error)
    return NextResponse.json(
      { error: "Failed to restore gear expense" },
      { status: 500 }
    )
  }
}

