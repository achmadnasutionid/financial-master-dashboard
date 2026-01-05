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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get the Paragon ticket
    const ticket = await prisma.paragonTicket.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            details: true
          }
        }
      }
    })

    if (!ticket) {
      return NextResponse.json(
        { error: "Paragon ticket not found" },
        { status: 404 }
      )
    }

    // Check if already finalized
    if (ticket.status === "final") {
      return NextResponse.json(
        { error: "Ticket is already finalized" },
        { status: 400 }
      )
    }

    // Update ticket status to final
    await prisma.paragonTicket.update({
      where: { id },
      data: { status: "final" }
    })

    // Generate expense ID
    const expenseId = await generateExpenseId()

    // Prepare expense items from Paragon ticket items
    // Group by product name and sum the totals (including all details)
    const expenseItems = ticket.items.map(item => ({
      productName: item.productName,
      budgeted: item.total, // Total includes all details
      actual: 0, // Leave actual as 0
      difference: item.total // difference = budgeted - actual (item.total - 0)
    }))

    // Calculate totals
    const totalBudgeted = expenseItems.reduce((sum, item) => sum + item.budgeted, 0)

    // Create draft expense
    const expense = await prisma.expense.create({
      data: {
        expenseId,
        projectName: ticket.billTo, // Bill To -> Project Name
        productionDate: ticket.productionDate, // Production Date
        clientBudget: ticket.totalAmount, // Total -> Client Budget
        paidAmount: ticket.totalAmount, // Total -> Paid Amount
        totalItemBudgeted: totalBudgeted,
        totalItemDifferences: 0,
        notes: "PARAGON", // Auto-filled with PARAGON
        status: "draft",
        items: {
          create: expenseItems
        }
      },
      include: {
        items: true
      }
    })

    return NextResponse.json({
      success: true,
      ticket: { id: ticket.id, status: "final" },
      expense: expense
    })
  } catch (error: any) {
    console.error("Error finalizing Paragon ticket:", error)
    return NextResponse.json(
      { 
        error: "Failed to finalize ticket and create expense",
        details: error.message || "Unknown error"
      },
      { status: 500 }
    )
  }
}

