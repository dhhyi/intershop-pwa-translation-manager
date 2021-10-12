module.exports = {
  "*": [() => "ng lint --fix", "prettier --write", () => "ng build"],
};
