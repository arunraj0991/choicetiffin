const fs = require('fs');
const path = require('path');

const projectRoot = fs.realpathSync(__dirname);

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: [projectRoot],
          alias: {
            '@': projectRoot,
          },
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        },
      ],
    ],
  };
};
