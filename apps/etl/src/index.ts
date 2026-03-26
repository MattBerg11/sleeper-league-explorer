import { LEAGUE_IDS, createSupabaseClient } from '@sleeper-explorer/shared'
import type { SupabaseClient } from '@sleeper-explorer/shared'

import { runSync } from './sync'
import type { SyncMode } from './sync'

const VALID_SYNC_MODES: readonly string[] = [
  'full',
  'players-only',
  'leagues-only',
  'daily',
  'initiate',
] as const

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing required environment variable: ${name}`)
    process.exit(1)
  }
  return value
}

function parseLeagueIds(envValue: string | undefined): string[] {
  if (!envValue) {
    return Object.values(LEAGUE_IDS)
  }
  return envValue.split(',').map((id) => id.trim()).filter(Boolean)
}

function parseSyncMode(envValue: string | undefined): SyncMode {
  const mode = envValue ?? 'full'
  if (!VALID_SYNC_MODES.includes(mode)) {
    console.error(`Invalid SYNC_MODE: "${mode}". Must be one of: ${VALID_SYNC_MODES.join(', ')}`)
    process.exit(1)
  }
  return mode as SyncMode
}

async function main(): Promise<void> {
  const supabaseUrl = getRequiredEnv('SUPABASE_URL')
  const supabaseKey = getRequiredEnv('SUPABASE_SERVICE_KEY')
  const leagueIds = parseLeagueIds(process.env['LEAGUE_IDS'])
  const syncMode = parseSyncMode(process.env['SYNC_MODE'])

  console.log(`Starting ETL sync (mode: ${syncMode})`)
  console.log(`Leagues: ${leagueIds.join(', ')}`)

  const supabase: SupabaseClient = createSupabaseClient(supabaseUrl, supabaseKey)

  const result = await runSync({ supabase, leagueIds, syncMode })

  console.log('\n=== Sync Summary ===')
  for (const entry of result.results) {
    const status = entry.success ? 'OK' : 'FAIL'
    const count = entry.count !== undefined ? ` (${entry.count.toLocaleString()} rows)` : ''
    const error = entry.error ? ` — ${entry.error}` : ''
    console.log(`  [${status}] ${entry.entity}${count}${error}`)
  }

  const failures = result.results.filter((r) => !r.success)
  if (failures.length > 0) {
    console.error(`\nSync completed with ${failures.length} failure(s)`)
    process.exit(1)
  }

  console.log('\nSync completed successfully')
}

main().catch((err: unknown) => {
  console.error('Unhandled error during sync:', err)
  process.exit(1)
})