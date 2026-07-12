const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')
const workspacePackagesRoot = path.resolve(workspaceRoot, 'packages')

const config = getDefaultConfig(projectRoot)

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot]

// 2. Let Metro know where to resolve packages
// and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// pnpm's node_modules is symlink-heavy (content-addressable store). Without
// this, Metro can resolve two physical copies of the same package through
// different symlink paths, breaking module singletons.
config.resolver.unstable_enableSymlinks = true

// 3. Handle `.js` imports pointing to `.ts`/`.tsx` files in workspace
// packages (NodeNext-style specifiers on TypeScript source). Scoped to
// packages/* only — importing files from node_modules, Expo, React Native,
// or any other dependency never has a reason to be rewritten this way, and
// doing it unconditionally risks silently redirecting an unrelated package's
// internal `.js` import.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const fromWorkspacePackage = context.originModulePath.startsWith(workspacePackagesRoot)

  if (fromWorkspacePackage && moduleName.startsWith('.') && moduleName.endsWith('.js')) {
    const withoutJs = moduleName.slice(0, -3)
    try {
      return context.resolveRequest(context, withoutJs, platform)
    } catch {
      // Fall through to normal resolution.
    }
  }

  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
