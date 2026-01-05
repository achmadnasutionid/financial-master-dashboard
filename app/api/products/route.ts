import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Default products to seed
const DEFAULT_PRODUCTS = [
  "PHOTOGRAPHER",
  "RETOUCHER",
  "PROPS / SET",
  "VIDEOGRAPHER",
  "MUA HAIR",
  "MODEL / HAND MODEL",
  "STUDIO / LIGHTING",
  "FASHION STYLIST",
  "GRAFFER",
  "MANAGER",
  "FOOD & DRINK",
  "ACOMODATION",
  "PRINT"
]

// Seed default products if database is empty
async function seedDefaultProducts() {
  const count = await prisma.product.count()
  
  if (count === 0) {
    for (const productName of DEFAULT_PRODUCTS) {
      try {
        await prisma.product.create({
          data: { name: productName }
        })
      } catch (error) {
        // Ignore duplicate errors, continue with next product
      }
    }
  }
}

// GET all products (excluding soft-deleted)
export async function GET(request: Request) {
  try {
    // Seed defaults if database is empty
    await seedDefaultProducts()
    
    const { searchParams } = new URL(request.url)
    const includeDeleted = searchParams.get("includeDeleted") === "true"
    
    const products = await prisma.product.findMany({
      where: includeDeleted ? {} : { deletedAt: null },
      orderBy: {
        createdAt: "asc" // Keep default order
      }
    })
    
    // Cache master data for 60 seconds (rarely changes)
    return NextResponse.json(products, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    )
  }
}

// POST create new product
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 }
      )
    }

    // Check for duplicate name (excluding soft-deleted)
    const existing = await prisma.product.findFirst({
      where: { name: name.trim(), deletedAt: null }
    })

    if (existing) {
      return NextResponse.json(
        { error: "Product name already exists" },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim()
      }
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error("Error creating product:", error)
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    )
  }
}

