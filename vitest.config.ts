import { defineConfig } from 'vitest/config'

// Unit tests (src/**, api/**) and database tests (supabase/tests/**).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'api/**/*.test.ts', 'supabase/tests/**/*.test.ts'],
    // Dates are tested in the family's time zone, including the October daylight saving change.
    env: { TZ: 'Europe/Copenhagen' },
    // Each database test file starts its own in-memory Postgres (PGlite), which takes a few seconds.
    testTimeout: 30_000,
  },
})
