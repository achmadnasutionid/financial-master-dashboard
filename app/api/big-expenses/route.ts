import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET all big expenses (with optional year filter)
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

    const expenses = await prisma.bigExpense.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(expenses)
  } catch (error) {
    console.error("Error fetching big expenses:", error)
    return NextResponse.json(
      { error: "Failed to fetch big expenses" },
      { status: 500 }
    )
  }
}

// POST create new big expense
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

    const expense = await prisma.bigExpense.create({
      data: {
        name,
        amount: parseFloat(amount),
        date: date ? new Date(date) : null,
        year: parseInt(year),
      },
    })

    return NextResponse.json(expense)
  } catch (error) {
    console.error("Error creating big expense:", error)
    return NextResponse.json(
      { error: "Failed to create big expense" },
      { status: 500 }
    )
  }
}

