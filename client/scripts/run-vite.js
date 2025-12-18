#!/usr/bin/env node
// Helper script to run vite build in production environment
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Try different possible paths for vite
const possiblePaths = [
  join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js'),
  join(projectRoot, 'node_modules', '.bin', 'vite'),
  join(projectRoot, 'node_modules', 'vite', 'dist', 'node', 'cli.js'),
];

let vitePath = null;
for (const path of possiblePaths) {
  if (existsSync(path)) {
    vitePath = path;
    break;
  }
}

if (!vitePath) {
  console.error('Error: Could not find vite executable');
  process.exit(1);
}

// Get command line arguments (skip node and script name)
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

