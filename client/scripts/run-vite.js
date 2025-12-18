#!/usr/bin/env node
// Helper script to run vite build in production environment
// This script tries multiple methods to find and run vite
import { spawn, execSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const require = createRequire(import.meta.url);

// Try different methods to find vite
let vitePath = null;

// Method 1: Try require.resolve (works in most cases)
try {
  vitePath = require.resolve('vite/bin/vite.js');
} catch (e) {
  // Method 2: Try manual paths relative to project root
  const projectPaths = [
    join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js'),
    join(projectRoot, 'node_modules', '.bin', 'vite'),
    join(projectRoot, 'node_modules', 'vite', 'dist', 'node', 'cli.js'),
  ];

  for (const path of projectPaths) {
    if (existsSync(path)) {
      vitePath = path;
      break;
    }
  }
  
  // Method 3: Try with process.cwd() if projectRoot didn't work
  if (!vitePath) {
    const cwd = process.cwd();
    const cwdPaths = [
      join(cwd, 'node_modules', 'vite', 'bin', 'vite.js'),
      join(cwd, 'node_modules', '.bin', 'vite'),
      join(cwd, 'node_modules', 'vite', 'dist', 'node', 'cli.js'),
    ];
    
    for (const path of cwdPaths) {
      if (existsSync(path)) {
        vitePath = path;
        break;
      }
    }
  }
}

// Method 4: If still not found, try using npm run which sets PATH correctly
if (!vitePath) {
  console.warn('Could not find vite directly, trying npm run vite-build...');
  try {
    const args = process.argv.slice(2);
    execSync(`npm run vite-build`, {
      stdio: 'inherit',
      cwd: projectRoot,
      env: { ...process.env, PATH: process.env.PATH },
    });
    process.exit(0);
  } catch (error) {
    console.error('Error: Could not find vite executable');
    console.error('Project root:', projectRoot);
    console.error('Current working directory:', process.cwd());
    process.exit(1);
  }
}

// Get command line arguments (skip node and script name)
const args = process.argv.slice(2);

// Spawn vite process
const vite = spawn('node', [vitePath, ...args], {
  stdio: 'inherit',
  cwd: projectRoot,
  shell: false,
  env: { ...process.env, PATH: process.env.PATH },
});

vite.on('error', (error) => {
  console.error('Error running vite:', error);
  process.exit(1);
});

vite.on('exit', (code) => {
  process.exit(code || 0);
});
