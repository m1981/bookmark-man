import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

// Get the test file path from command line arguments
const testFilePath = process.argv[2];

if (!testFilePath) {
  console.error('Please provide a test file path');
  console.error('Example: npm run test:file tests/BookmarkRestructuringService.test.js');
  process.exit(1);
}

// Ensure the file exists
if (!fs.existsSync(testFilePath)) {
  console.error(`Test file not found: ${testFilePath}`);
  process.exit(1);
}

// Extract the implementation file path from the test file
// This assumes your test files import the implementation file
const testFileContent = fs.readFileSync(testFilePath, 'utf8');
const importMatch = testFileContent.match(/import\s+\w+\s+from\s+['"](.+?)['"];?/);

if (!importMatch) {
  console.error('Could not find import statement in test file');
  process.exit(1);
}

// Get the relative path from the import statement
let implementationPath = importMatch[1];

// If the path starts with a dot (relative path), resolve it relative to the test file
if (implementationPath.startsWith('.')) {
  const testDir = path.dirname(testFilePath);
  implementationPath = path.resolve(testDir, implementationPath);
  
  // Make the path relative to the current working directory
  implementationPath = path.relative(process.cwd(), implementationPath);
}

console.log(`Found implementation file: ${implementationPath}`);

try {
  // Run the test with coverage
  console.log(`\n=== Running tests with coverage for ${testFilePath} ===\n`);
  execSync(`npx vitest run --coverage ${testFilePath}`, { stdio: 'inherit' });
  
  // Run Stryker mutation testing on the implementation file
  console.log(`\n=== Running mutation tests for ${implementationPath} ===\n`);
  
  // Create a temporary Stryker config for this specific test
  const tempConfigPath = path.join(process.cwd(), 'stryker.temp.conf.mjs');
  const tempStrykerConfig = `export default {
    packageManager: "npm",
    reporters: ["html", "clear-text", "progress"],
    testRunner: "command",  // Use command runner instead of vitest
    coverageAnalysis: "perTest",
    concurrency: 4, // Set explicit concurrency to avoid NaN warning
    plugins: [
      "@stryker-mutator/typescript-checker"
      // Removed vitest-runner plugin
    ],
    commandRunner: {
      command: "npx vitest run ${testFilePath.replace(/\\/g, '\\\\')}"
    }
  };`;

  console.log(`Creating temporary Stryker config at ${tempConfigPath}`);
  console.log(`Config contents:\n${tempStrykerConfig}`);
  fs.writeFileSync(tempConfigPath, tempStrykerConfig);

  try {
    // Run Stryker with the temporary config AND explicitly set the mutate flag
    console.log(`\n=== Running mutation tests for ${implementationPath} with custom config ===\n`);
    execSync(`npx stryker run --mutate "${implementationPath}" ${tempConfigPath}`, { stdio: 'inherit' });
  } finally {
    // Keep the config file for debugging
    console.log(`Temporary config file kept at: ${tempConfigPath}`);
  }
  
  console.log('\n=== All tests completed successfully ===\n');
} catch (error) {
  console.error('Error running tests:', error.message);
  process.exit(1);
}