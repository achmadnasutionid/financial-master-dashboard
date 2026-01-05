import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// POST restore soft-deleted big expense
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const expense = await prisma.bigExpense.update({
      where: { id },
      data: { deletedAt: null },
    })

    return NextResponse.json(expense)
  } catch (error) {
    console.error("Error restoring big expense:", error)
    return NextResponse.json(
      { error: "Failed to restore big expense" },
      { status: 500 }
    )
  }
}

