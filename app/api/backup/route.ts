import { NextResponse } from "next/server"

/**
 * Backup API
 * 
 * With Neon PostgreSQL, backups are handled automatically.
 * This endpoint is kept for compatibility but no longer creates local backups.
 */
export async function GET() {
  return NextResponse.json({ 
    success: true, 
    message: "Backups are managed automatically by Neon PostgreSQL",
    created: false,
    provider: "neon"
  })
}
