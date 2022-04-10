module.exports = {
  '*': [
    () => 'nx format',
    () => 'nx affected --target=lint',
    () => 'nx affected --target=build',
    () => 'nx affected --target=test',
  ],
};
