const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot]

// 2. Let Metro know where to resolve packages
// and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// 3. Force Metro to resolve (sub)dependencies only from the `nodeModulesPaths`
// This removes the need for configuring `alias` in `babel.config.js`
// config.resolver.disableHierarchicalLookup = true;

// 4. Handle `.js` imports pointing to `.ts`/`.tsx` files in workspace packages
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.endsWith('.js')) {
    try {
      return context.resolveRequest(context, moduleName, platform)
    } catch (e) {
      const noExt = moduleName.replace(/\.js$/, '')
      try {
        return context.resolveRequest(context, noExt, platform)
      } catch (err2) {
        throw e
      }
    }
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
