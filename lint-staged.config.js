module.exports = {
  "*": ["prettier --write", () => "ng lint --fix", () => "ng build"],
};
