import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(process.cwd(), 'dist');
fs.rmSync(DIST, { recursive: true, force: true });
console.log('Cleaned dist directory.');
