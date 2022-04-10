module.exports = {
  displayName: "back-end",
  preset: "../../jest.preset.js",
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/tsconfig.spec.json",
    },
  },
  testEnvironment: "node",
  transform: {
    "^.+\\.[tj]s$": "ts-jest",
  },
  moduleFileExtensions: ["ts", "js", "html"],
  coverageDirectory: "../../coverage/apps/back-end",
  setupFilesAfterEnv: [
    "jest-extended/all",
    "<rootDir>/server.setup.axios.js",
    "<rootDir>/server.setup.lodash.js",
  ],
};
