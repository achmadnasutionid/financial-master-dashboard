import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET all years that have expense data
export async function GET() {
  try {
    const expenses = await prisma.expense.findMany({
      select: {
        productionDate: true
      },
      orderBy: {
        productionDate: "desc"
      }
    })

    // Extract unique years
    const yearsSet = new Set<number>()
    expenses.forEach(expense => {
      const year = new Date(expense.productionDate).getFullYear()
      yearsSet.add(year)
    })

    // Convert to sorted array (descending)
    const years = Array.from(yearsSet).sort((a, b) => b - a)

    return NextResponse.json(years)
  } catch (error) {
    console.error("Error fetching expense years:", error)
    return NextResponse.json(
      { error: "Failed to fetch expense years" },
      { status: 500 }
    )
  }
}

