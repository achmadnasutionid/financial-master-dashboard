/**
 * Backup utilities
 * 
 * Note: With Neon PostgreSQL, backups are handled automatically by Neon.
 * Neon provides:
 * - Point-in-time recovery
 * - Automatic backups
 * - Database branching for snapshots
 * 
 * This module is kept for API compatibility but no longer creates local backups.
 */

// Get current week's backup name (for display purposes)
export function getCurrentWeekBackupName(): string {
  const now = new Date()
  const year = now.getFullYear()
  const week = getWeekNumber(now).toString().padStart(2, "0")
  return `backup-${year}-W${week}`
}

// Get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// Check if backup exists - always returns true with Neon (backups are automatic)
export function weeklyBackupExists(): boolean {
  return true // Neon handles backups automatically
}

// Create backup - no-op with Neon (backups are automatic)
export async function createWeeklyBackup(): Promise<{ success: boolean; message: string }> {
  return { 
    success: true, 
    message: "Backups are managed automatically by Neon PostgreSQL" 
  }
}

// Get backup list - returns info about Neon backups
export function getBackupList(): Array<{ name: string; date: Date; size: number }> {
  return [{
    name: "Neon Automatic Backups",
    date: new Date(),
    size: 0
  }]
}
