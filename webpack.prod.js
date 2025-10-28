const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

// Chrome Extension Scripts Configuration - Production
const extensionConfig = {
  mode: 'production',
  entry: {
    background: './src/background.js',
    content: './src/content.js',
    sidepanel: './src/sidepanel.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist-prod'),
    filename: '[name].js'
  },
  resolve: {
    fallback: {
      "crypto": false,
      "stream": false,
      "util": false
    }
  },
  plugins: [
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(false)
    }),
    new CopyPlugin({
      patterns: [
        { from: "manifest.prod.json", to: "manifest.json" },
        { from: "config.json", to: "config.json" },
        { from: "src/sidepanel.html", to: "sidepanel.html" },
        { from: "src/sidepanel.css", to: "sidepanel.css" },
        { from: "icons/", to: "icons/" },
        { from: "_locales/", to: "_locales/" },
        { from: "lib/content-extractor-unified.js", to: "lib/content-extractor-unified.js" },
        { from: "lib/readability-browser.js", to: "lib/readability.js" },
        { from: "lib/readability-readerable-browser.js", to: "lib/readability-readerable.js" }
      ]
    })
  ],
  optimization: {
    minimize: false
  }
};

module.exports = extensionConfig;