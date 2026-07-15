/**
 * The one sanctioned `console.*` call site in this app (AI_AGENT_RULES §11:
 * "no console.* in features (use the logger)"). Every other module must
 * import `logger` from here instead of calling `console.*` directly —
 * enforced by an eslint override in the root config that disables
 * `no-console` only for this file, mirroring how `packages/domain/src/errors`
 * is the sole exemption for `new Error(...)`.
 *
 * Never pass PII, financial values, or secrets — `safeMetadata` only
 * (NFR-SEC-004), same discipline as `AppError.safeMetadata`.
 */
export type LogFields = Readonly<Record<string, string | number | boolean | undefined>>

function write(level: 'info' | 'warn' | 'error', message: string, fields?: LogFields): void {
  const entry = { level, message, ...(fields ?? {}) }
  console[level](JSON.stringify(entry))
}

export const logger = {
  info: (message: string, fields?: LogFields) => {
    write('info', message, fields)
  },
  warn: (message: string, fields?: LogFields) => {
    write('warn', message, fields)
  },
  error: (message: string, fields?: LogFields) => {
    write('error', message, fields)
  },
}
