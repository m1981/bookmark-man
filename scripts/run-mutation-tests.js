#!/usr/bin/env node

import { execSync } from 'child_process';

console.log('Running mutation tests with Stryker...');

try {
  execSync('npx stryker run', { stdio: 'inherit' });
  console.log('Mutation testing completed successfully!');
  console.log('Check the reports folder for detailed results.');
} catch (error) {
  console.error('Mutation testing failed:', error.message);
  process.exit(1);
}