module.exports = {
  "*": [
    () => "nx format",
    () => "nx affected --target=lint -- --fix",
    () => "nx affected --target=build",
    () => "nx affected --target=test",
  ],
};
