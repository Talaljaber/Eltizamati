// @ts-check
import { defineConfig } from 'eslint/config'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import globals from 'globals'

export default defineConfig([
  {
    // Global ignore patterns
    ignores: [
      '**/node_modules/**',
      '**/.claude/**',
      '**/.agents/**',
      '**/.expo/**',
      '**/dist/**',
      '**/build/**',
      '**/*.generated.*',
      'apps/mobile/src/core/supabase/database.types.ts',
      'apps/bank-simulator-dashboard/src/server/supabase/database.types.ts',
      'apps/bank-simulator-dashboard/.next/**',
      'apps/bank-simulator-dashboard/playwright-report/**',
      'apps/bank-simulator-dashboard/test-results/**',
      'supabase/**',
      // drizzle-kit output
      '**/drizzle/**',
      '**/*.d.ts',
    ],
  },

  // ─── Base rules for all TypeScript files ──────────────────────────────────
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  tseslint.configs.disableTypeChecked,

  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        // Auto-discovers the nearest tsconfig per file across the monorepo
        // (root tsconfig for packages/*, apps/mobile/tsconfig.json for the app).
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // ── Money & type safety ────────────────────────────────────────────
      // Prevent floating-point arithmetic on numbers that represent money
      // (use Money VO from packages/domain — AI_AGENT_RULES §5)
      'no-restricted-syntax': [
        'error',
        // Forbid `new Error(...)` outside core error module
        {
          selector: "NewExpression[callee.name='Error']:not([callee.object.name='AppError'])",
          message:
            'Throw AppError via taxonomy codes (ADR-0014). Only packages/domain/src/errors/ may construct raw Error.',
        },
      ],

      // ── Console ban in feature code ───────────────────────────────────
      'no-console': 'error',

      // ── Strictness ────────────────────────────────────────────────────
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

      // ── i18n — no hardcoded user-visible strings ─────────────────────
      // Enforced manually in code review (lint-wise handled by no-literal-jsx-strings
      // in RN-specific config below)

      // ── Allow unused vars with underscore prefix (common TS pattern) ──
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // ─── React Native / app-specific rules ────────────────────────────────────
  {
    files: ['apps/mobile/**/*.tsx', 'apps/mobile/**/*.ts'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // ─── Bank Simulator Dashboard (Next.js web app) ───────────────────────────
  {
    files: ['apps/bank-simulator-dashboard/**/*.tsx', 'apps/bank-simulator-dashboard/**/*.ts'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    // `@supabase/*` and privileged env values must never leave the server
    // boundary of this app — the depcruise rule
    // `no-supabase-outside-dashboard-server-boundary` enforces the import
    // graph; this eslint override is the one sanctioned `console.*` call
    // site (the app-wide logger), see src/server/logging/logger.ts's header.
    files: ['apps/bank-simulator-dashboard/src/server/logging/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  // ─── Relax some strict rules in test files ────────────────────────────────
  {
    files: ['**/__tests__/**', '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/strict-boolean-expressions': 'off',
    },
  },

  // ─── Config files (CommonJS, loose rules) ─────────────────────────────────
  {
    files: [
      '*.cjs',
      '*.js',
      '**/*.config.js',
      '**/*.config.ts',
      '**/jest-setup.js',
      '**/metro.config.js',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
])
