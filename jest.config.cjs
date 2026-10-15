module.exports = {
  testEnvironment: "<rootDir>/jest.environment.cjs",
  roots: ["<rootDir>/src"],
  transform: { "^.+\\.[jt]sx?$": "babel-jest" },
};
