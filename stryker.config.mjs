// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  packageManager: "npm",
  reporters: ["html", "clear-text", "progress"],
  testRunner: "vitest",
  coverageAnalysis: "perTest",
  mutate: [
    "src/**/*.js",
    "!src/**/*.test.js",
    "!src/**/__tests__/**/*"
  ],
  plugins: [
    "@stryker-mutator/typescript-checker",
    "@stryker-mutator/vitest-runner"
  ],
  vitest: {
    configFile: "vitest.config.ts"
  },
  commandRunner: {
    command: "npx vitest run --no-file-parallelism"
  },
  timeoutMS: 60000,
  thresholds: {
    high: 80,
    low: 60,
    break: 50
  }
};

export default config;