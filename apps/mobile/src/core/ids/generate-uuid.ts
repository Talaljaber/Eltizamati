/** Generates a UUID accepted by PostgreSQL, including on Hermes without randomUUID(). */
export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  let remainingTimestamp = Date.now()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (placeholder) => {
    const randomNibble = ((remainingTimestamp + Math.random() * 16) % 16) | 0
    remainingTimestamp = Math.floor(remainingTimestamp / 16)
    return (placeholder === 'x' ? randomNibble : (randomNibble & 0x3) | 0x8).toString(16)
  })
}
