import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET all companies (excluding soft-deleted)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeDeleted = searchParams.get("includeDeleted") === "true"
    
    const companies = await prisma.company.findMany({
      where: includeDeleted ? {} : { deletedAt: null },
      orderBy: {
        createdAt: "desc"
      }
    })
    // Cache master data for 60 seconds (rarely changes)
    return NextResponse.json(companies, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error("Error fetching companies:", error)
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    )
  }
}

// POST create new company
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, address, city, province, postalCode, telp, email } = body

    // Validate required fields
    if (!name || !address || !city || !province) {
      return NextResponse.json(
        { error: "Name, address, city, and province are required" },
        { status: 400 }
      )
    }

    // Check for duplicate name (excluding soft-deleted)
    const existing = await prisma.company.findFirst({
      where: { name, deletedAt: null }
    })

    if (existing) {
      return NextResponse.json(
        { error: "Company name already exists" },
        { status: 400 }
      )
    }

    const company = await prisma.company.create({
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

    return NextResponse.json(company, { status: 201 })
  } catch (error) {
    console.error("Error creating company:", error)
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 }
    )
  }
}

