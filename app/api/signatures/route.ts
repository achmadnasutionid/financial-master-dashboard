import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET all signatures (excluding soft-deleted)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeDeleted = searchParams.get("includeDeleted") === "true"
    
    const signatures = await prisma.signature.findMany({
      where: includeDeleted ? {} : { deletedAt: null },
      orderBy: {
        createdAt: "desc"
      }
    })
    return NextResponse.json(signatures)
  } catch (error) {
    console.error("Error fetching signatures:", error)
    return NextResponse.json(
      { error: "Failed to fetch signatures" },
      { status: 500 }
    )
  }
}

// POST create new signature
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, role, imageData } = body

    // Validate required fields
    if (!name || !imageData) {
      return NextResponse.json(
        { error: "Name and signature image are required" },
        { status: 400 }
      )
    }

    // Check for duplicate name (excluding soft-deleted)
    const existing = await prisma.signature.findFirst({
      where: { name, deletedAt: null }
    })

    if (existing) {
      return NextResponse.json(
        { error: "Signature name already exists" },
        { status: 400 }
      )
    }

    const signature = await prisma.signature.create({
      data: {
        name,
        role,
        imageData
      }
    })

    return NextResponse.json(signature, { status: 201 })
  } catch (error) {
    console.error("Error creating signature:", error)
    return NextResponse.json(
      { error: "Failed to create signature" },
      { status: 500 }
    )
  }
}

