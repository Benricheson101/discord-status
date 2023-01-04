module.exports = {
  ...require('gts/.prettierrc.json'),
  pluginSearchDirs: [__dirname],
  importOrder: ['^node:', '<THIRD_PARTY_MODULES>', '^discord-status', '^[./]'],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
};
