import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(process.cwd());
const repoRoot = process.env.COBBLEMON_REPO
  ? path.resolve(ROOT, process.env.COBBLEMON_REPO)
  : path.resolve(ROOT, '..', 'cobblemon');
const sourceRoot = process.env.COBBLEMON_SOURCE_ROOT
  ? path.resolve(ROOT, process.env.COBBLEMON_SOURCE_ROOT)
  : path.join(repoRoot, 'common', 'src', 'main', 'resources');
const dataRoot = path.join(sourceRoot, 'data', 'cobblemon');
const assetsRoot = path.join(sourceRoot, 'assets', 'cobblemon');
const bedrockRoot = path.join(assetsRoot, 'bedrock');
const langRoot = path.join(assetsRoot, 'lang');
const outputDir = path.join(ROOT, 'schemas', 'generated');

assertDirectory(dataRoot);
assertDirectory(assetsRoot);
assertDirectory(bedrockRoot);
assertDirectory(langRoot);

const generatedAt = new Date().toISOString();
const sourceRevision = readGitRevision(repoRoot);

const dataJsonFiles = walkFiles(dataRoot, (entry) => entry.endsWith('.json'));
const speciesJsonFiles = dataJsonFiles.filter((filePath) => normalizePath(filePath).includes('/species/'));
const poserFiles = walkFiles(bedrockRoot, (entry) => entry.endsWith('.json') && normalizePath(entry).includes('/posers/'));
const modelFiles = walkFiles(bedrockRoot, (entry) => entry.endsWith('.geo.json'));
const animationFiles = walkFiles(bedrockRoot, (entry) => entry.endsWith('.animation.json'));
const textureFiles = walkFiles(assetsRoot, (entry) => entry.endsWith('.png'));
const langFiles = walkFiles(langRoot, (entry) => entry.endsWith('.json'));

const dataIndex = {
  schemaVersion: 1,
  namespace: 'cobblemon',
  generatedAt,
  sourceRoot: normalizePath(path.relative(ROOT, sourceRoot)),
  sourceRevision,
  speciesIds: sortedUnique(speciesJsonFiles.map((filePath) => `cobblemon:${path.basename(filePath, '.json').toLowerCase()}`)),
};

const assetIndex = {
  schemaVersion: 1,
  namespace: 'cobblemon',
  generatedAt,
  sourceRoot: normalizePath(path.relative(ROOT, sourceRoot)),
  sourceRevision,
  poserIds: sortedUnique(poserFiles.map((filePath) => `cobblemon:${path.basename(filePath, '.json').toLowerCase()}`)),
  modelIds: sortedUnique(modelFiles.map((filePath) => `cobblemon:${path.basename(filePath, '.json').toLowerCase()}`)),
  animationGroupNames: sortedUnique(animationFiles.map((filePath) => path.basename(filePath).replace(/\.animation\.json$/i, '').toLowerCase())),
  textureIds: sortedUnique(textureFiles.map((filePath) => `cobblemon:${normalizePath(path.relative(assetsRoot, filePath)).toLowerCase()}`)),
  langKeys: collectLangKeys(langFiles),
};

fs.mkdirSync(outputDir, { recursive: true });
writeJson(path.join(outputDir, 'cobblemon-default-data-index.json'), dataIndex);
writeJson(path.join(outputDir, 'cobblemon-default-assets-index.json'), assetIndex);

console.log(`Generated Cobblemon indexes from ${normalizePath(sourceRoot)} (${sourceRevision ?? 'no git revision found'}).`);
console.log(`Data files scanned: ${dataJsonFiles.length}, species ids: ${dataIndex.speciesIds.length}`);
console.log(`Textures: ${assetIndex.textureIds.length}, models: ${assetIndex.modelIds.length}, posers: ${assetIndex.poserIds.length}, animations: ${assetIndex.animationGroupNames.length}, lang keys: ${assetIndex.langKeys.length}`);

function walkFiles(root, include, output = []) {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, include, output);
      continue;
    }

    if (entry.isFile() && include(fullPath)) {
      output.push(fullPath);
    }
  }

  return output;
}

function sortedUnique(values) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function collectLangKeys(langFiles) {
  const keys = new Set();

  for (const filePath of langFiles) {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      continue;
    }

    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string') {
        keys.add(key);
      }
    }
  }

  return Array.from(keys).sort((a, b) => a.localeCompare(b));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

function assertDirectory(dirPath) {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    throw new Error(`Expected directory to exist: ${normalizePath(dirPath)}`);
  }
}

function readGitRevision(root) {
  try {
    return execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return undefined;
  }
}
