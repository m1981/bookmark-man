// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  packageManager: "npm",
  reporters: ["html", "clear-text", "progress"],
  testRunner: "vitest",
  coverageAnalysis: "perTest",
  // Comment out the TypeScript checker temporarily
  // checkers: ["typescript"],
  // tsconfigFile: "tsconfig.json",
  // typescriptChecker: {
  //   prioritizePerformanceOverAccuracy: true
  // },
  mutate: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/__tests__/**/*"
  ],
  plugins: [
    "@stryker-mutator/typescript-checker",
    "@stryker-mutator/vitest-runner"
  ],
  vitest: {
    configFile: "vitest.config.ts"
  },
  concurrency: 4,
  timeoutMS: 60000,
  thresholds: {
    high: 80,
    low: 60,
    break: 50
  }
};

export default config;