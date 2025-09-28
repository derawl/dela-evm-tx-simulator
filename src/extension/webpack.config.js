/**
 * Webpack configuration for VS Code extension
 * Bundles the extension for distribution
 */

const path = require('path');

module.exports = {
  target: 'node',
  mode: 'production',
  entry: './src/extension/extension.ts',
  output: {
    path: path.resolve(__dirname, '../../dist/extension'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: path.resolve(__dirname, '../../tsconfig.json')
            }
          }
        ]
      }
    ]
  }
};