import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET export expenses as CSV by year
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year")
    
    if (!year) {
      return NextResponse.json(
        { error: "Year parameter is required" },
        { status: 400 }
      )
    }

    const yearNum = parseInt(year)
    const startDate = new Date(yearNum, 0, 1) // January 1st
    const endDate = new Date(yearNum + 1, 0, 1) // January 1st next year

    // Fetch all products from master data (excluding soft-deleted)
    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" }
    })

    // Fetch all expenses for the year with items
    const expenses = await prisma.expense.findMany({
      where: {
        productionDate: {
          gte: startDate,
          lt: endDate
        }
      },
      include: {
        items: true
      },
      orderBy: {
        productionDate: "asc"
      }
    })

    // Create product column names
    const productColumns = products.map(p => p.name)

    // Build CSV header
    const headers = [
      "ID",
      "Bill To",
      "Production Date",
      "Total Budget",
      "Total Expenses",
      ...productColumns
    ]

    // Build CSV rows
    const rows: string[][] = []
    
    // Initialize totals
    const totals: Record<string, number> = {
      totalBudget: 0,
      totalExpenses: 0
    }
    productColumns.forEach(col => {
      totals[col] = 0
    })

    for (const expense of expenses) {
      // Create a map of product name to actual expense amount
      const productExpenses: Record<string, number> = {}
      expense.items.forEach(item => {
        productExpenses[item.productName] = item.actual
      })

      // Calculate total expenses (sum of all item actual amounts)
      const totalExpenseAmount = expense.items.reduce((sum, item) => sum + item.actual, 0)

      // Format production date
      const prodDate = new Date(expense.productionDate)
      const formattedDate = `${prodDate.getDate().toString().padStart(2, '0')}/${(prodDate.getMonth() + 1).toString().padStart(2, '0')}/${prodDate.getFullYear()}`

      // Build row
      const row: string[] = [
        expense.expenseId,
        expense.projectName,
        formattedDate,
        expense.clientBudget.toString(),
        totalExpenseAmount.toString(),
        ...productColumns.map(col => (productExpenses[col] || 0).toString())
      ]
      
      rows.push(row)

      // Accumulate totals
      totals.totalBudget += expense.clientBudget
      totals.totalExpenses += totalExpenseAmount
      productColumns.forEach(col => {
        totals[col] += productExpenses[col] || 0
      })
    }

    // Add totals row
    const totalsRow: string[] = [
      "TOTAL",
      "",
      "",
      totals.totalBudget.toString(),
      totals.totalExpenses.toString(),
      ...productColumns.map(col => totals[col].toString())
    ]
    rows.push(totalsRow)

    // Convert to CSV string
    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n')

    // Return as CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="expenses-${year}.csv"`
      }
    })
  } catch (error) {
    console.error("Error exporting expenses:", error)
    return NextResponse.json(
      { error: "Failed to export expenses" },
      { status: 500 }
    )
  }
}

