import * as vscode from 'vscode';
import { parse, parseTree, type ParseError } from 'jsonc-parser';
import { type ParsedJsonFile } from '../types';

export async function parseWorkspaceJson(uri: vscode.Uri): Promise<ParsedJsonFile> {
  const raw = await vscode.workspace.fs.readFile(uri);
  const text = Buffer.from(raw).toString('utf8');

  const parseErrors: ParseError[] = [];
  const value = parse(text, parseErrors, {
    allowEmptyContent: false,
    allowTrailingComma: true,
    disallowComments: false,
  });

  const root = parseTree(text);

  return {
    uri,
    text,
    value,
    root,
    parseErrors,
    lineOffsets: computeLineOffsets(text),
  };
}

function computeLineOffsets(text: string): number[] {
  const result: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      result.push(i + 1);
    }
  }
  return result;
}
