import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET single expense
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        items: true
      }
    })

    if (!expense) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(expense)
  } catch (error) {
    console.error("Error fetching expense:", error)
    return NextResponse.json(
      { error: "Failed to fetch expense" },
      { status: 500 }
    )
  }
}

// PUT update expense
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // If only status is provided, just update the status
    if (body.status && Object.keys(body).length === 1) {
      const expense = await prisma.expense.update({
        where: { id },
        data: {
          status: body.status
        }
      })
      return NextResponse.json(expense)
    }

    // Delete existing items
    await prisma.expenseItem.deleteMany({
      where: { expenseId: id }
    })

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        projectName: body.projectName,
        clientBudget: parseFloat(body.clientBudget),
        notes: body.notes || null,
        status: body.status || "draft",
        totalItemBudgeted: parseFloat(body.totalItemBudgeted) || 0,
        totalItemDifferences: parseFloat(body.totalItemDifferences) || 0,
        items: {
          create: body.items?.map((item: any) => ({
            productName: item.productName,
            budgeted: parseFloat(item.budgeted),
            actual: parseFloat(item.actual),
            difference: parseFloat(item.budgeted) - parseFloat(item.actual)
          })) || []
        }
      },
      include: {
        items: true
      }
    })

    return NextResponse.json(expense)
  } catch (error) {
    console.error("Error updating expense:", error)
    return NextResponse.json(
      { error: "Failed to update expense" },
      { status: 500 }
    )
  }
}

// DELETE expense
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.expense.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting expense:", error)
    return NextResponse.json(
      { error: "Failed to delete expense" },
      { status: 500 }
    )
  }
}

