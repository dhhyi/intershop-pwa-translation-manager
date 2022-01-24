var path = require("path");

module.exports = {
  entry: "./server.mjs",
  target: "node",
  mode: "production",
  externals: {
    express: "commonjs express",
  },
  experiments: {
    topLevelAwait: true,
  },
  output: {
    path: path.join(__dirname, "dist"),
    filename: "server-bundle.js",
  },
};
