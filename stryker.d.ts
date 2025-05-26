declare module '@stryker-mutator/api/core' {
  interface PartialStrykerOptions {
    packageManager: string;
    reporters: string[];
    testRunner: string;
    coverageAnalysis: string;
    checkers: string[];
    tsconfigFile: string;
    typescriptChecker: {
      prioritizePerformanceOverAccuracy: boolean;
    };
    mutate: string[];
    plugins: string[];
    vitest: {
      configFile: string;
    };
    concurrency: number;
    timeoutMS: number;
    logLevel?: string;
    thresholds: {
      high: number;
      low: number;
      break: number;
    };
  }
}