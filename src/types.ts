import * as vscode from 'vscode';
import { type Node as JsonNode, type ParseError } from 'jsonc-parser';

export interface SchemaIndexEntry {
  name: string;
  path: string;
  $id?: string;
}

export interface ParsedJsonFile {
  uri: vscode.Uri;
  text: string;
  value: unknown;
  root: JsonNode | undefined;
  parseErrors: ParseError[];
  lineOffsets: number[];
}

export interface WorkspaceSpeciesRecord {
  id: string;
  namespace: string;
  slug: string;
  displayName: string;
  dexNumber?: number;
  uri: vscode.Uri;
}

export interface ResolverRecord {
  parsed: ParsedJsonFile;
  namespace: string;
  pathNorm: string;
}

export interface PoserRecord {
  parsed: ParsedJsonFile;
  namespace: string;
  pathNorm: string;
  poserId: string;
  isPokemonPoser: boolean;
}

export interface LangRequirement {
  parsed: ParsedJsonFile;
  key: string;
  pointer: Array<string | number>;
}

export interface SchemaResolution {
  schemaPath: string;
  schemaName: string;
}
