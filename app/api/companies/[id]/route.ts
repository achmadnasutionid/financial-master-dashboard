import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET single company (excluding soft-deleted)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const company = await prisma.company.findFirst({
      where: { id, deletedAt: null }
    })

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(company)
  } catch (error) {
    console.error("Error fetching company:", error)
    return NextResponse.json(
      { error: "Failed to fetch company" },
      { status: 500 }
    )
  }
}

// PUT update company
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, address, city, province, postalCode, telp, email } = body

    // Validate required fields
    if (!name || !address || !city || !province) {
      return NextResponse.json(
        { error: "Name, address, city, and province are required" },
        { status: 400 }
      )
    }

    // Check for duplicate name (excluding current company and soft-deleted)
    const existing = await prisma.company.findFirst({
      where: {
        name,
        deletedAt: null,
        NOT: { id }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: "Company name already exists" },
        { status: 400 }
      )
    }

    const company = await prisma.company.update({
      where: { id },
      data: {
        name,
        address,
        city,
        province,
        postalCode: postalCode || null,
        telp: telp || null,
        email: email || null
      }
    })

    return NextResponse.json(company)
  } catch (error) {
    console.error("Error updating company:", error)
    return NextResponse.json(
      { error: "Failed to update company" },
      { status: 500 }
    )
  }
}

// DELETE company (soft delete)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.company.update({
      where: { id },
      data: { deletedAt: new Date() }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting company:", error)
    return NextResponse.json(
      { error: "Failed to delete company" },
      { status: 500 }
    )
  }
}

// PATCH restore company
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    if (body.action === "restore") {
      await prisma.company.update({
        where: { id },
        data: { deletedAt: null }
      })
      return NextResponse.json({ success: true })
    }
    
    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error restoring company:", error)
    return NextResponse.json(
      { error: "Failed to restore company" },
      { status: 500 }
    )
  }
}

