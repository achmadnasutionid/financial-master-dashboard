import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST - Create expense from invoice when marked as paid
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params

    // Fetch the invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: {
          include: {
            details: true
          }
        }
      }
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      )
    }

    // Check if invoice is paid
    if (invoice.status !== "paid") {
      return NextResponse.json(
        { error: "Only paid invoices can create expenses" },
        { status: 400 }
      )
    }

    // Check if expense already exists for this invoice
    const existingExpense = await prisma.expense.findFirst({
      where: { invoiceId }
    })

    if (existingExpense) {
      return NextResponse.json(
        { expense: existingExpense },
        { status: 200 }
      )
    }

    // Generate Expense ID
    const year = new Date().getFullYear()
    const lastExpense = await prisma.expense.findFirst({
      where: {
        expenseId: {
          startsWith: `EXP-${year}-`
        }
      },
      orderBy: {
        expenseId: "desc"
      }
    })

    let newNumber = 1
    if (lastExpense) {
      const lastNumber = parseInt(lastExpense.expenseId.split("-")[2])
      newNumber = lastNumber + 1
    }

    const expenseId = `EXP-${year}-${newNumber.toString().padStart(4, "0")}`

    // Get planning data if invoice has planning reference
    let planningItems: any[] = []
    let clientBudget = 0
    if (invoice.planningId) {
      const planning = await prisma.planning.findUnique({
        where: { id: invoice.planningId },
        include: {
          items: true
        }
      })
      if (planning) {
        planningItems = planning.items
        clientBudget = planning.clientBudget
      }
    }

    // Create expense items from invoice items
    // If planning exists, use planning expense values; otherwise use 0 for actual
    const expenseItems = invoice.items.map((invoiceItem) => {
      const planningItem = planningItems.find(
        (pi) => pi.productName === invoiceItem.productName
      )

      return {
        productName: invoiceItem.productName,
        budgeted: invoiceItem.total,
        actual: planningItem ? planningItem.expense : 0, // Pre-fill from planning if available, otherwise 0
        difference: planningItem
          ? invoiceItem.total - planningItem.expense
          : invoiceItem.total
      }
    })

    // Create expense
    const expense = await prisma.expense.create({
      data: {
        expenseId,
        invoiceId,
        planningId: invoice.planningId,
        projectName: invoice.billTo,
        productionDate: invoice.productionDate, // Auto-filled from invoice
        clientBudget, // Auto-filled from planning or 0
        paidAmount: invoice.totalAmount, // Amount actually paid (invoice total after tax)
        notes: invoice.notes,
        status: "draft",
        items: {
          create: expenseItems
        }
      },
      include: {
        items: true
      }
    })

    // Update invoice with generated expense ID
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { generatedExpenseId: expense.id }
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error("Error creating expense:", error)
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    )
  }
}

