import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET single big expense
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const expense = await prisma.bigExpense.findUnique({
      where: { id },
    })

    if (!expense) {
      return NextResponse.json(
        { error: "Big expense not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(expense)
  } catch (error) {
    console.error("Error fetching big expense:", error)
    return NextResponse.json(
      { error: "Failed to fetch big expense" },
      { status: 500 }
    )
  }
}

// PUT update big expense
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, amount, date, year } = body

    const expense = await prisma.bigExpense.update({
      where: { id },
      data: {
        name,
        amount: parseFloat(amount),
        date: date ? new Date(date) : null,
        year: parseInt(year),
      },
    })

    return NextResponse.json(expense)
  } catch (error) {
    console.error("Error updating big expense:", error)
    return NextResponse.json(
      { error: "Failed to update big expense" },
      { status: 500 }
    )
  }
}

// DELETE (soft delete) big expense
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const expense = await prisma.bigExpense.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json(expense)
  } catch (error) {
    console.error("Error deleting big expense:", error)
    return NextResponse.json(
      { error: "Failed to delete big expense" },
      { status: 500 }
    )
  }
}

