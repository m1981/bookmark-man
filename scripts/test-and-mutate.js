#!/usr/bin/env node

import { execSync } from 'child_process';

console.log('Running tests with coverage...');

try {
  // Run tests with coverage
  execSync('npx vitest run --coverage', { stdio: 'inherit' });
  
  console.log('Coverage check passed! Running mutation tests...');
  
  // Run mutation tests
  execSync('npx stryker run', { stdio: 'inherit' });
  
  console.log('All tests completed successfully!');
} catch (error) {
  console.error('Testing failed:', error.message);
  process.exit(1);
}