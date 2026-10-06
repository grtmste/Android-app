#!/usr/bin/env node
/**
 * Packages theme/modafie into dist/modafie-theme.zip (top-level folder "modafie/"),
 * ready for Appearance → Themes → Add New → Upload Theme.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const themeParent = path.join(root, 'theme');
const out = path.join(root, 'dist', 'modafie-theme.zip');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.rmSync(out, { force: true });
execFileSync('zip', ['-r', '-q', '-X', out, 'modafie', '-x', '*.DS_Store', '-x', '*/node_modules/*', '-x', '*/.git*'], { cwd: themeParent, stdio: 'inherit' });
const kb = (fs.statSync(out).size / 1024).toFixed(0);
console.log(`dist/modafie-theme.zip (${kb} KB)`);
