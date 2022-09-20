const { merge } = require('webpack-merge');
const path = require('path');
const HtmlWebpackPlugin = require("html-webpack-plugin");

const pages = ['multiple-viewers', 'image-viewer', 'light-scenarios'];

module.exports = (config, context) => {
  return merge(config, {
    entry: pages.reduce((all, page) => {
      all[page] = ['./src/polyfills.ts', `./src/examples/${page}/index.ts`, './src/styles.css'];
      return all;
    }, {}),
    output: {
      filename: "[name].js",
      path: path.resolve(__dirname, 'public'),
    },
    plugins: [].concat(
      pages.map(
        (page) =>
          new HtmlWebpackPlugin({
            inject: true,
            chunks: [page],
            template: `./src/examples/${page}/index.html`,
            filename: `${page}/index.html`
          })
      )
    ),
  });
};
