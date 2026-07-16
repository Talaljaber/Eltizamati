import type { NextConfig } from 'next'

// The three workspace packages ship raw TypeScript source (no build step —
// `"main": "./src/index.ts"`), so Next must transpile them itself rather
// than treating them as pre-compiled node_modules.
const nextConfig: NextConfig = {
  transpilePackages: ['@eltizamati/domain', '@eltizamati/finance-engine', '@eltizamati/demo-data'],
  reactStrictMode: true,
  eslint: {
    // Linting runs repo-wide via `pnpm run lint` (eslint . --max-warnings=0);
    // `next build` re-running its own lint pass would duplicate that gate.
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // The workspace packages write NodeNext-style relative imports
    // (`./value-objects/money.js`) that point at `.ts` source files —
    // webpack doesn't map `.js` extension requests to `.ts` files by
    // default, so it needs this alias to resolve them.
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
    }
    return config
  },
}

export default nextConfig
