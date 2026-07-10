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
