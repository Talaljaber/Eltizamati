/**
 * Next.js instrumentation hook — runs once when the server process starts,
 * before any request is handled. This is where "refuse to start" (docs/
 * dashboard.md §3, §20) is enforced: `getDashboardEnv()` throws synchronously
 * if the environment is unsafe (disabled, or a production deployment without
 * an explicit remote-allow flag), which crashes the process here rather than
 * failing on the first request.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getDashboardEnv } = await import('./server/env')
    getDashboardEnv()
  }
}
