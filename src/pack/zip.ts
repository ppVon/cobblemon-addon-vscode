import * as path from 'path';
import * as zlib from 'zlib';
import * as vscode from 'vscode';
import { normalizePath } from '../core/utils';

export interface ZipEntry {
  relativePath: string;
  content: Uint8Array;
  modifiedAt: Date;
}

const EXCLUDED_TOP_LEVEL = new Set<string>([
  '.cobblemon-schema-tools',
  '.git',
  '.github',
  '.idea',
  '.vscode',
  'node_modules',
]);

const EXCLUDED_FILE_SUFFIXES = ['.zip'];

export async function collectWorkspaceZipEntries(
  workspaceRoot: vscode.Uri,
): Promise<ZipEntry[]> {
  const entries: ZipEntry[] = [];
  await walkDirectory(workspaceRoot, workspaceRoot, entries);
  entries.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return entries;
}

export function buildZipArchive(entries: readonly ZipEntry[]): Uint8Array {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const relativePath = normalizeZipPath(entry.relativePath);
    const fileName = Buffer.from(relativePath, 'utf8');
    const raw = Buffer.from(entry.content);
    const compressed = zlib.deflateRawSync(raw);
    const crc = crc32(raw);
    const { time, date } = toDosDateTime(entry.modifiedAt);

    const localHeader = Buffer.alloc(30 + fileName.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(date, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(raw.length, 22);
    localHeader.writeUInt16LE(fileName.length, 26);
    localHeader.writeUInt16LE(0, 28);
    fileName.copy(localHeader, 30);

    localParts.push(localHeader, compressed);

    const centralHeader = Buffer.alloc(46 + fileName.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(time, 12);
    centralHeader.writeUInt16LE(date, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(raw.length, 24);
    centralHeader.writeUInt16LE(fileName.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    fileName.copy(centralHeader, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + compressed.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const centralOffset = offset;

  const endOfCentralDirectory = Buffer.alloc(22);
  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0);
  endOfCentralDirectory.writeUInt16LE(0, 4);
  endOfCentralDirectory.writeUInt16LE(0, 6);
  endOfCentralDirectory.writeUInt16LE(entries.length, 8);
  endOfCentralDirectory.writeUInt16LE(entries.length, 10);
  endOfCentralDirectory.writeUInt32LE(centralSize, 12);
  endOfCentralDirectory.writeUInt32LE(centralOffset, 16);
  endOfCentralDirectory.writeUInt16LE(0, 20);

  return Buffer.concat([
    ...localParts,
    ...centralParts,
    endOfCentralDirectory,
  ]);
}

async function walkDirectory(
  workspaceRoot: vscode.Uri,
  currentDir: vscode.Uri,
  entries: ZipEntry[],
): Promise<void> {
  const children = await vscode.workspace.fs.readDirectory(currentDir);

  for (const [name, fileType] of children) {
    const childUri = vscode.Uri.joinPath(currentDir, name);
    const relativePath = normalizeZipPath(
      path.relative(workspaceRoot.fsPath, childUri.fsPath),
    );

    if (shouldExclude(relativePath)) {
      continue;
    }

    if (fileType === vscode.FileType.Directory) {
      await walkDirectory(workspaceRoot, childUri, entries);
      continue;
    }

    if (fileType !== vscode.FileType.File) {
      continue;
    }

    const content = await vscode.workspace.fs.readFile(childUri);
    const stat = await vscode.workspace.fs.stat(childUri);
    entries.push({
      relativePath,
      content,
      modifiedAt: new Date(stat.mtime || Date.now()),
    });
  }
}

function shouldExclude(relativePath: string): boolean {
  if (!relativePath || relativePath === '.') {
    return false;
  }

  const parts = normalizeZipPath(relativePath)
    .split('/')
    .filter((part) => part.length > 0);
  if (parts.length === 0) {
    return false;
  }

  if (EXCLUDED_TOP_LEVEL.has(parts[0])) {
    return true;
  }

  const fileName = parts[parts.length - 1];
  return EXCLUDED_FILE_SUFFIXES.some((suffix) => fileName.endsWith(suffix));
}

function normalizeZipPath(value: string): string {
  return normalizePath(value).replace(/^\/+/, '');
}

function toDosDateTime(date: Date): { time: number; date: number } {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  return {
    time: (hours << 11) | (minutes << 5) | seconds,
    date: ((year - 1980) << 9) | (month << 5) | day,
  };
}

let crcTable: Uint32Array | undefined;

function crc32(buffer: Uint8Array): number {
  const table = getCrcTable();
  let crc = 0xffffffff;

  for (let i = 0; i < buffer.length; i++) {
    crc = table[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function getCrcTable(): Uint32Array {
  if (crcTable) {
    return crcTable;
  }

  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let value = i;
    for (let bit = 0; bit < 8; bit++) {
      value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }

  crcTable = table;
  return table;
}
