import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Helper function to generate Expense ID in format EXP-YYYY-NNNN
async function generateExpenseId() {
  const year = new Date().getFullYear()
  const prefix = `EXP-${year}-`
  
  const lastExpense = await prisma.expense.findFirst({
    where: {
      expenseId: {
        startsWith: prefix
      }
    },
    orderBy: {
      expenseId: "desc"
    }
  })

  let nextNumber = 1
  if (lastExpense) {
    const lastNumber = parseInt(lastExpense.expenseId.split("-")[2])
    nextNumber = lastNumber + 1
  }

  return `${prefix}${nextNumber.toString().padStart(4, "0")}`
}

// POST copy expense
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get the original expense with all related data
    const originalExpense = await prisma.expense.findUnique({
      where: { id },
      include: {
        items: true
      }
    })

    if (!originalExpense) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      )
    }

    // Generate new expense ID
    const newExpenseId = await generateExpenseId()

    // Create a copy with "- Copy" appended to project name
    const copiedExpense = await prisma.expense.create({
      data: {
        expenseId: newExpenseId,
        projectName: `${originalExpense.projectName} - Copy`,
        productionDate: originalExpense.productionDate,
        clientBudget: originalExpense.clientBudget,
        paidAmount: originalExpense.paidAmount,
        notes: originalExpense.notes,
        totalItemBudgeted: originalExpense.totalItemBudgeted,
        totalItemDifferences: originalExpense.totalItemDifferences,
        status: "draft", // Always create copy as draft
        items: {
          create: originalExpense.items.map(item => ({
            productName: item.productName,
            budgeted: item.budgeted,
            actual: item.actual,
            difference: item.difference
          }))
        }
      },
      include: {
        items: true
      }
    })

    return NextResponse.json(copiedExpense, { status: 201 })
  } catch (error) {
    console.error("Error copying expense:", error)
    return NextResponse.json(
      { error: "Failed to copy expense" },
      { status: 500 }
    )
  }
}
