type Listener = () => void

const listeners = new Set<Listener>()

/** Signals that a local data-mode transition may require auth-boundary reconciliation. */
export function notifyAuthBoundaryChanged(): void {
  listeners.forEach((listener) => listener())
}

export function subscribeAuthBoundaryChanged(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
