import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, out);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      out.push(fullPath);
    }
  }
  return out;
}

const htmlFiles = walk(SRC);
for (const sourcePath of htmlFiles) {
  const relativePath = path.relative(SRC, sourcePath);
  const targetPath = path.join(DIST, relativePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

console.log(`Copied ${htmlFiles.length} HTML asset(s) to dist.`);
