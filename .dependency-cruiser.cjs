/** @type {import('@dependency-cruiser/types').IConfiguration} */
module.exports = {
  forbidden: [
    // ─── LAYER RULES (system-architecture.md §2) ───────────────────────────
    {
      name: 'no-upward-domain-import',
      comment:
        'Domain packages (domain, finance-engine, demo-data) must never import from the app or infrastructure.',
      severity: 'error',
      from: {
        path: '^packages/(domain|finance-engine|demo-data)/',
      },
      to: {
        path: '^apps/',
      },
    },
    {
      name: 'no-ui-direct-storage',
      comment:
        'UI (app/ routes + feature components) must never import repositories, SQLite, or providers directly.',
      severity: 'error',
      from: {
        path: '^apps/mobile/app/',
      },
      to: {
        path: '^apps/mobile/src/core/storage/',
      },
    },
    {
      name: 'no-ui-direct-services-except-composition-root',
      comment: 'Route files must not import application services directly — use query hooks.',
      severity: 'warn',
      from: {
        path: '^apps/mobile/app/',
      },
      to: {
        path: '^apps/mobile/src/services/(?!composition-root)',
      },
    },
    // ─── DOMAIN PURITY RULES ────────────────────────────────────────────────
    {
      name: 'domain-no-react-native',
      comment: 'Domain packages must never depend on React Native or Expo.',
      severity: 'error',
      from: {
        path: '^packages/(domain|finance-engine)/',
      },
      to: {
        path: 'node_modules/(react-native|expo)',
        pathNot: 'node_modules/@types',
      },
    },
    {
      name: 'domain-no-sqlite',
      comment: 'Domain packages must never depend on SQLite or Drizzle.',
      severity: 'error',
      from: {
        path: '^packages/(domain|finance-engine)/',
      },
      to: {
        path: 'node_modules/(expo-sqlite|drizzle-orm|drizzle-kit)',
      },
    },
    {
      name: 'domain-no-supabase',
      comment: 'Domain packages must never depend on Supabase.',
      severity: 'error',
      from: {
        path: '^packages/(domain|finance-engine)/',
      },
      to: {
        path: 'node_modules/@supabase',
      },
    },
    {
      name: 'no-supabase-outside-infrastructure',
      comment:
        'supabase-js is confined to core/supabase and services/repositories/supabase (Phase 4, NFR-SEC-003, PHASE-04 exit criterion 7).',
      severity: 'error',
      from: {
        path: '^apps/mobile/',
        pathNot: '^apps/mobile/src/(core/supabase|services/auth|services/repositories/supabase)/',
      },
      to: {
        path: 'node_modules/@supabase',
      },
    },
    {
      name: 'no-supabase-outside-dashboard-server-boundary',
      comment:
        'The dashboard uses a service-role Supabase client (no RLS backstop — bypasses it entirely), so supabase-js and nodemailer are confined to src/server/** (docs/dashboard.md §3: privileged access is server-only, never in a browser component or client boundary).',
      severity: 'error',
      from: {
        path: '^apps/bank-simulator-dashboard/',
        pathNot: '^apps/bank-simulator-dashboard/src/server/',
      },
      to: {
        path: 'node_modules/(@supabase|nodemailer)',
      },
    },
    {
      name: 'no-dashboard-secrets-in-shared-components',
      comment:
        'src/components/** are shared presentation primitives (used from both server and client boundaries) and must stay secret-free — server-only env/Supabase/email modules belong in src/app/** route files or server actions, not in reusable components.',
      severity: 'error',
      from: {
        path: '^apps/bank-simulator-dashboard/src/components/',
      },
      to: {
        path: '^apps/bank-simulator-dashboard/src/server/(env|allowlist|supabase|email)',
      },
    },
    // ─── MONEY / FORMATTING RULES ────────────────────────────────────────────
    {
      name: 'no-raw-console-in-features',
      comment: 'Features must use the logger — no console.* (AI_AGENT_RULES §11, NFR-SEC-004).',
      severity: 'warn',
      from: {
        path: '^apps/mobile/src/features/',
      },
      to: {
        path: '^(console)$',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/(?:@[^/]+/)?[^/]+',
      },
    },
  },
}
