/** Node always has global crypto.randomUUID() (Node 20+) — no Hermes fallback needed here. */
export function generateUuid(): string {
  return crypto.randomUUID()
}
