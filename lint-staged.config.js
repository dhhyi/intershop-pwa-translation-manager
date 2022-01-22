module.exports = {
  "*": [
    () => "ng lint --fix",
    "prettier --write",
    () => "npm run build",
    () => "npm test",
  ],
};
