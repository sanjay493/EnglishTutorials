#!/usr/bin/env node
// Rebuilds every generated file, then runs the validator.
// Usage: node scripts/build-all.mjs [--no-check]
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from './lib.mjs';

const run = (script, ...args) => {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts', script), ...args], {
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run('build-plan.mjs');
run('build-index.mjs');
if (!process.argv.includes('--no-check')) run('check.mjs');
