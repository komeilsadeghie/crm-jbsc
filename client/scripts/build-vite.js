#!/usr/bin/env node
// Cross-platform script to run vite build
// This works on both Windows and Unix-like systems

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Try to find vite (only .js files, not shell scripts)
let vitePath = null;

const possiblePaths = [
  join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js'),
  join(projectRoot, 'node_modules', 'vite', 'dist', 'node', 'cli.js'),
];

for (const path of possiblePaths) {
  if (existsSync(path)) {
    vitePath = path;
    break;
  }
}

if (!vitePath) {
  console.error('Error: Could not find vite executable');
  console.error('Searched in:', projectRoot);
  process.exit(1);
}

// Get command line arguments
const args = process.argv.slice(2);

// Spawn vite process
const vite = spawn('node', [vitePath, ...args], {
  stdio: 'inherit',
  cwd: projectRoot,
  shell: false,
});

vite.on('error', (error) => {
  console.error('Error running vite:', error);
  process.exit(1);
});

vite.on('exit', (code) => {
  process.exit(code || 0);
});
