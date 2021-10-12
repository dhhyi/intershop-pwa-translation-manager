var path = require("path");

module.exports = {
  entry: "./server.js",
  target: "node",
  mode: "production",
  output: {
    path: path.join(__dirname, "dist"),
    filename: "server-bundle.js",
  },
};
