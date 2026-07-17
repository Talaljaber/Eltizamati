/**
 * Dashboard environment config — the single place `process.env` is read.
 *
 * This is a demo-only, no-auth tool (docs/dashboard.md §3), so its safety
 * rests entirely on this module: `SUPABASE_SECRET_KEY` and
 * `SMTP_APP_PASSWORD` must never reach browser code (this file is only ever
 * imported from src/server/ (anywhere under it), never from a src/app page's
 * client boundary or any `'use client'` module — enforced by the depcruise rule
 * `no-supabase-outside-dashboard-server-boundary`), and the allowlist gate
 * must be non-empty before any client-level data loads (docs/dashboard.md §6).
 *
 * Mirrors the mobile app's env-loading convention
 * (apps/mobile/src/core/config/env.ts): read `process.env` once into a raw
 * shape, validate with zod, return `Result<T, AppError>` so callers/tests
 * never touch `process.env` directly.
 */
import { z } from 'zod'
import {
  err,
  ok,
  makeError,
  DomainInvariantError,
  type Result,
  type AppError,
} from '@eltizamati/domain'

const truthy = new Set(['true', '1', 'yes'])

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') return fallback
  return truthy.has(value.trim().toLowerCase())
}

function parseCsvList(value: string | undefined): readonly string[] {
  if (value === undefined) return []
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

export interface RawDashboardEnv {
  readonly nodeEnv: string | undefined
  readonly demoDashboardEnabled: string | undefined
  readonly demoDashboardAllowRemote: string | undefined
  readonly demoAllowedUserIds: string | undefined
  readonly demoAllowedEmails: string | undefined
  readonly supabaseUrl: string | undefined
  readonly supabaseSecretKey: string | undefined
  readonly emailSendingEnabled: string | undefined
  readonly smtpHost: string | undefined
  readonly smtpPort: string | undefined
  readonly smtpUser: string | undefined
  readonly smtpAppPassword: string | undefined
  readonly smtpSenderName: string | undefined
  readonly smtpSenderEmail: string | undefined
}

/**
 * Unlike Metro (mobile's bundler), Node never statically inlines
 * `process.env.X` — it stays a live, mutable object at runtime, so this
 * reads it fresh on every call rather than snapshotting once at module load
 * (a stale snapshot would silently ignore env changes between requests, and
 * would break every test that mutates `process.env` after this module is
 * first imported).
 */
function readRawEnvFromProcess(): RawDashboardEnv {
  return {
    nodeEnv: process.env.NODE_ENV,
    demoDashboardEnabled: process.env.DEMO_DASHBOARD_ENABLED,
    demoDashboardAllowRemote: process.env.DEMO_DASHBOARD_ALLOW_REMOTE,
    demoAllowedUserIds: process.env.DEMO_ALLOWED_USER_IDS,
    demoAllowedEmails: process.env.DEMO_ALLOWED_EMAILS,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
    emailSendingEnabled: process.env.EMAIL_SENDING_ENABLED,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT,
    smtpUser: process.env.SMTP_USER,
    smtpAppPassword: process.env.SMTP_APP_PASSWORD,
    smtpSenderName: process.env.SMTP_SENDER_NAME,
    smtpSenderEmail: process.env.SMTP_SENDER_EMAIL,
  }
}

const dashboardEnvSchema = z
  .object({
    environment: z.enum(['local', 'demo']),
    demoDashboardEnabled: z.boolean(),
    demoDashboardAllowRemote: z.boolean(),
    demoAllowedUserIds: z.array(z.string().min(1)),
    demoAllowedEmails: z.array(z.string().email()),
    supabaseUrl: z.string().url(),
    supabaseSecretKey: z.string().min(1),
    emailSendingEnabled: z.boolean(),
    smtpHost: z.string().min(1),
    smtpPort: z.number().int().positive(),
    smtpUser: z.string(),
    smtpAppPassword: z.string(),
    smtpSenderName: z.string().min(1),
    smtpSenderEmail: z.string(),
  })
  .refine((config) => config.demoDashboardEnabled, {
    message: 'DEMO_DASHBOARD_ENABLED must be true — this app refuses to serve otherwise',
  })

export type DashboardEnv = z.infer<typeof dashboardEnvSchema>

/**
 * A "production deployment" here means the process was started with
 * NODE_ENV=production — the only host-agnostic signal available (this app
 * makes no assumption about which platform serves it). `next dev` never
 * sets this, so local development is unaffected.
 */
function isProductionDeployment(nodeEnv: string | undefined): boolean {
  return nodeEnv === 'production'
}

export function loadDashboardEnv(
  raw: RawDashboardEnv = readRawEnvFromProcess(),
): Result<DashboardEnv, AppError> {
  const demoDashboardEnabled = parseBoolean(raw.demoDashboardEnabled, false)
  const demoDashboardAllowRemote = parseBoolean(raw.demoDashboardAllowRemote, false)
  const isProduction = isProductionDeployment(raw.nodeEnv)

  // Stop condition (docs/dashboard.md §3, §20): a production deployment
  // without an explicit remote-allow flag must refuse to start — checked
  // before schema validation so a misconfigured-but-otherwise-valid env
  // still can't accidentally go live.
  if (isProduction && !demoDashboardAllowRemote) {
    return err(
      makeError('authorization', {
        safeMetadata: { reason: 'productionDeploymentWithoutRemoteAllow' },
        recoveryHint:
          'This is a local-only demo. Set DEMO_DASHBOARD_ALLOW_REMOTE=true only if you intend to deploy it, and understand this dashboard has no authentication.',
      }),
    )
  }

  const parsed = dashboardEnvSchema.safeParse({
    environment: isProduction ? 'demo' : 'local',
    demoDashboardEnabled,
    demoDashboardAllowRemote,
    demoAllowedUserIds: parseCsvList(raw.demoAllowedUserIds),
    demoAllowedEmails: parseCsvList(raw.demoAllowedEmails),
    supabaseUrl: raw.supabaseUrl,
    supabaseSecretKey: raw.supabaseSecretKey,
    emailSendingEnabled: parseBoolean(raw.emailSendingEnabled, false),
    smtpHost: raw.smtpHost ?? '',
    smtpPort: Number(raw.smtpPort ?? '587'),
    smtpUser: raw.smtpUser ?? '',
    smtpAppPassword: raw.smtpAppPassword ?? '',
    smtpSenderName: raw.smtpSenderName ?? '',
    smtpSenderEmail: raw.smtpSenderEmail ?? '',
  })

  if (!parsed.success) {
    return err(
      makeError('validation', {
        safeMetadata: { missingOrInvalidFields: parsed.error.issues.length },
        recoveryHint:
          'Set the required variables — see apps/bank-simulator-dashboard/.env.example.',
      }),
    )
  }

  return ok(parsed.data)
}

let cachedEnv: DashboardEnv | undefined

/**
 * Throwing accessor for server code paths where a misconfigured environment
 * is an unrecoverable boot-time invariant, not a business-level `Result` to
 * surface through UI (mirrors `DomainInvariantError`'s role for value-object
 * construction elsewhere in the codebase).
 */
export function getDashboardEnv(): DashboardEnv {
  if (cachedEnv !== undefined) return cachedEnv
  const result = loadDashboardEnv()
  if (!result.ok) {
    throw new DomainInvariantError(
      result.error.code,
      `Dashboard environment is invalid or unsafe (code: ${result.error.code}). ${result.error.recoveryHint ?? ''}`,
    )
  }
  cachedEnv = result.value
  return cachedEnv
}

/** Test-only: clears the memoized env so a test can reload with different raw input. */
export function resetDashboardEnvCacheForTests(): void {
  cachedEnv = undefined
}
