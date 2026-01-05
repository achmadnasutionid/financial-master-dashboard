import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET all billings (excluding soft-deleted)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeDeleted = searchParams.get("includeDeleted") === "true"
    
    const billings = await prisma.billing.findMany({
      where: includeDeleted ? {} : { deletedAt: null },
      orderBy: {
        createdAt: "desc"
      }
    })
    return NextResponse.json(billings)
  } catch (error) {
    console.error("Error fetching billings:", error)
    return NextResponse.json(
      { error: "Failed to fetch billings" },
      { status: 500 }
    )
  }
}

// POST create new billing
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, bankName, bankAccount, bankAccountName, ktp, npwp } = body

    // Validate required fields
    if (!name || !bankName || !bankAccount || !bankAccountName) {
      return NextResponse.json(
        { error: "Name, bank name, bank account, and bank account name are required" },
        { status: 400 }
      )
    }

    // Check for duplicate name (excluding soft-deleted)
    const existing = await prisma.billing.findFirst({
      where: { name, deletedAt: null }
    })

    if (existing) {
      return NextResponse.json(
        { error: "Billing name already exists" },
        { status: 400 }
      )
    }

    const billing = await prisma.billing.create({
      data: {
        name,
        bankName,
        bankAccount,
        bankAccountName,
        ktp: ktp || null,
        npwp: npwp || null
      }
    })

    return NextResponse.json(billing, { status: 201 })
  } catch (error) {
    console.error("Error creating billing:", error)
    return NextResponse.json(
      { error: "Failed to create billing" },
      { status: 500 }
    )
  }
}

