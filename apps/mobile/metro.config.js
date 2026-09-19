const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const tokensRoot = path.resolve(workspaceRoot, 'packages/tokens');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [...(config.watchFolders ?? []), tokensRoot];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  '@trinqa/tokens': tokensRoot,
};

module.exports = config;
