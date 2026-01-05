import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET all gear expenses (with optional year filter)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year")
    const showDeleted = searchParams.get("showDeleted") === "true"

    const whereClause: any = {}
    
    if (year && year !== "all") {
      whereClause.year = parseInt(year)
    }
    
    if (!showDeleted) {
      whereClause.deletedAt = null
    }

    const expenses = await prisma.gearExpense.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(expenses)
  } catch (error) {
    console.error("Error fetching gear expenses:", error)
    return NextResponse.json(
      { error: "Failed to fetch gear expenses" },
      { status: 500 }
    )
  }
}

// POST create new gear expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, amount, date, year } = body

    if (!name || amount === undefined || !year) {
      return NextResponse.json(
        { error: "Name, amount, and year are required" },
        { status: 400 }
      )
    }

    const expense = await prisma.gearExpense.create({
      data: {
        name,
        amount: parseFloat(amount),
        date: date ? new Date(date) : null,
        year: parseInt(year),
      },
    })

    return NextResponse.json(expense)
  } catch (error) {
    console.error("Error creating gear expense:", error)
    return NextResponse.json(
      { error: "Failed to create gear expense" },
      { status: 500 }
    )
  }
}

