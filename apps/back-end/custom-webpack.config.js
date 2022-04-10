// Helper for combining webpack config objects
const { merge } = require("webpack-merge");

module.exports = (config) => {
  return merge(config, {
    externals: {
      express: "commonjs express",
    },
    experiments: {
      topLevelAwait: true,
    },
  });
};
