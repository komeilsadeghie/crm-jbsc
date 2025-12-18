#!/usr/bin/env node
// Cross-platform script to run vite build
// This works on both Windows and Unix-like systems

import { spawn } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const scriptDir = resolve(__dirname);
const projectRoot = resolve(scriptDir, '..');
const cwd = process.cwd();
const require = createRequire(import.meta.url);

// Try to find vite (only .js files, not shell scripts)
let vitePath = null;

// Method 1: Try require.resolve (most reliable)
try {
  vitePath = require.resolve('vite/bin/vite.js');
} catch (e) {
  // Method 2: Try manual paths
  const searchDirs = [
    projectRoot,  // Relative to script location
    cwd,          // Current working directory
  ];

  const relativePaths = [
    'node_modules/vite/bin/vite.js',
    'node_modules/vite/dist/node/cli.js',
  ];

  const possiblePaths = [];
  for (const dir of searchDirs) {
    for (const relPath of relativePaths) {
      const fullPath = join(dir, relPath);
      possiblePaths.push(fullPath);
    }
  }

  // Try each path
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      vitePath = path;
      break;
    }
  }
}

if (!vitePath) {
  console.error('Error: Could not find vite executable');
  console.error('Project root:', projectRoot);
  console.error('Current working directory:', cwd);
  process.exit(1);
}

// Get command line arguments
const args = process.argv.slice(2);

// Use projectRoot as working directory (usually more reliable than cwd)
const workingDir = existsSync(join(projectRoot, 'package.json')) ? projectRoot : cwd;

// Spawn vite process
const vite = spawn('node', [vitePath, ...args], {
  stdio: 'inherit',
  cwd: workingDir,
  shell: false,
});

vite.on('error', (error) => {
  console.error('Error running vite:', error);
  process.exit(1);
});

vite.on('exit', (code) => {
  process.exit(code || 0);
});
