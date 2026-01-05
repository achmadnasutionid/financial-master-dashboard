import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET single billing (excluding soft-deleted)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const billing = await prisma.billing.findFirst({
      where: { id, deletedAt: null }
    })

    if (!billing) {
      return NextResponse.json(
        { error: "Billing not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(billing)
  } catch (error) {
    console.error("Error fetching billing:", error)
    return NextResponse.json(
      { error: "Failed to fetch billing" },
      { status: 500 }
    )
  }
}

// PUT update billing
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, bankName, bankAccount, bankAccountName, ktp, npwp } = body

    // Validate required fields
    if (!name || !bankName || !bankAccount || !bankAccountName) {
      return NextResponse.json(
        { error: "Name, bank name, bank account, and bank account name are required" },
        { status: 400 }
      )
    }

    // Check for duplicate name (excluding current billing and soft-deleted)
    const existing = await prisma.billing.findFirst({
      where: {
        name,
        deletedAt: null,
        NOT: { id }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: "Billing name already exists" },
        { status: 400 }
      )
    }

    const billing = await prisma.billing.update({
      where: { id },
      data: {
        name,
        bankName,
        bankAccount,
        bankAccountName,
        ktp: ktp || null,
        npwp: npwp || null
      }
    })

    return NextResponse.json(billing)
  } catch (error) {
    console.error("Error updating billing:", error)
    return NextResponse.json(
      { error: "Failed to update billing" },
      { status: 500 }
    )
  }
}

// DELETE billing (soft delete)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    await prisma.billing.update({
      where: { id },
      data: { deletedAt: new Date() }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting billing:", error)
    return NextResponse.json(
      { error: "Failed to delete billing", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// PATCH restore billing
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    if (body.action === "restore") {
      await prisma.billing.update({
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
    console.error("Error restoring billing:", error)
    return NextResponse.json(
      { error: "Failed to restore billing" },
      { status: 500 }
    )
  }
}

