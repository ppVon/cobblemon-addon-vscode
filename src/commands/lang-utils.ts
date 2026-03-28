import * as path from 'path';
import * as vscode from 'vscode';
import { parse, printParseErrorCode, type ParseError } from '../core/jsonc-parser';
import { normalizeSlug } from '../core/utils';

export async function upsertSpeciesLangEntries(
  workspaceRoot: vscode.Uri,
  namespace: string,
  speciesId: string,
  speciesName: string,
  speciesDescription: string,
  langCode: string
): Promise<vscode.Uri | undefined> {
  const langDir = vscode.Uri.joinPath(workspaceRoot, 'assets', namespace, 'lang');
  await vscode.workspace.fs.createDirectory(langDir);
  const langUri = vscode.Uri.joinPath(langDir, `${langCode}.json`);

  const nameKey = `${namespace}.species.${speciesId}.name`;
  const descKey = `${namespace}.species.${speciesId}.desc`;

  let exists = true;
  try {
    await vscode.workspace.fs.stat(langUri);
  } catch {
    exists = false;
  }

  let langObject: Record<string, unknown> = {};
  if (exists) {
    const raw = await vscode.workspace.fs.readFile(langUri);
    const text = Buffer.from(raw).toString('utf8');
    const parseErrors: ParseError[] = [];
    const parsed = parse(text, parseErrors, {
      allowEmptyContent: false,
      allowTrailingComma: true,
      disallowComments: false,
    });

    if (parseErrors.length > 0) {
      const first = parseErrors[0];
      void vscode.window.showErrorMessage(
        `Could not update lang file ${path.basename(langUri.fsPath)}: ${printParseErrorCode(first.error)}.`
      );
      return undefined;
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      void vscode.window.showErrorMessage(`Could not update lang file ${path.basename(langUri.fsPath)}: expected a JSON object.`);
      return undefined;
    }

    langObject = { ...(parsed as Record<string, unknown>) };
  }

  let changed = !exists;

  const currentName = langObject[nameKey];
  if (typeof currentName !== 'string' || currentName.trim().length === 0) {
    langObject[nameKey] = speciesName;
    changed = true;
  }

  const currentDesc = langObject[descKey];
  if (typeof currentDesc !== 'string' || currentDesc.trim().length === 0) {
    langObject[descKey] = speciesDescription;
    changed = true;
  }

  if (changed) {
    await vscode.workspace.fs.writeFile(langUri, Buffer.from(JSON.stringify(langObject, null, 2) + '\n', 'utf8'));
  }

  return langUri;
}

export async function upsertMoveLangEntries(
  workspaceRoot: vscode.Uri,
  namespace: string,
  moveIdSource: string,
  moveName: string,
  moveDescription: string,
  langCode: string
): Promise<vscode.Uri | undefined> {
  const moveSlug = normalizeSlug(moveIdSource);
  if (!moveSlug) {
    return undefined;
  }

  const langDir = vscode.Uri.joinPath(workspaceRoot, 'assets', namespace, 'lang');
  await vscode.workspace.fs.createDirectory(langDir);
  const langUri = vscode.Uri.joinPath(langDir, `${langCode}.json`);

  const nameKey = `${namespace}.move.${moveSlug}`;
  const descKey = `${namespace}.move.${moveSlug}.desc`;

  const langObject = await readWritableLangObject(langUri);
  if (!langObject) {
    return undefined;
  }

  let changed = !(await exists(langUri));

  const currentName = langObject[nameKey];
  if (typeof currentName !== 'string' || currentName.trim().length === 0) {
    langObject[nameKey] = moveName;
    changed = true;
  }

  const currentDesc = langObject[descKey];
  if (typeof currentDesc !== 'string' || currentDesc.trim().length === 0) {
    langObject[descKey] = moveDescription;
    changed = true;
  }

  if (changed) {
    await vscode.workspace.fs.writeFile(langUri, Buffer.from(JSON.stringify(langObject, null, 2) + '\n', 'utf8'));
  }

  return langUri;
}

export async function upsertAbilityLangEntries(
  workspaceRoot: vscode.Uri,
  namespace: string,
  abilityIdSource: string,
  abilityName: string,
  abilityDescription: string,
  langCode: string
): Promise<vscode.Uri | undefined> {
  const abilitySlug = normalizeSlug(abilityIdSource);
  if (!abilitySlug) {
    return undefined;
  }

  const langDir = vscode.Uri.joinPath(workspaceRoot, 'assets', namespace, 'lang');
  await vscode.workspace.fs.createDirectory(langDir);
  const langUri = vscode.Uri.joinPath(langDir, `${langCode}.json`);

  const nameKey = `${namespace}.ability.${abilitySlug}`;
  const descKey = `${namespace}.ability.${abilitySlug}.desc`;

  const langObject = await readWritableLangObject(langUri);
  if (!langObject) {
    return undefined;
  }

  let changed = !(await exists(langUri));

  const currentName = langObject[nameKey];
  if (typeof currentName !== 'string' || currentName.trim().length === 0) {
    langObject[nameKey] = abilityName;
    changed = true;
  }

  const currentDesc = langObject[descKey];
  if (typeof currentDesc !== 'string' || currentDesc.trim().length === 0) {
    langObject[descKey] = abilityDescription;
    changed = true;
  }

  if (changed) {
    await vscode.workspace.fs.writeFile(langUri, Buffer.from(JSON.stringify(langObject, null, 2) + '\n', 'utf8'));
  }

  return langUri;
}

async function readWritableLangObject(
  langUri: vscode.Uri,
): Promise<Record<string, unknown> | undefined> {
  const hasExistingFile = await exists(langUri);
  if (!hasExistingFile) {
    return {};
  }

  const raw = await vscode.workspace.fs.readFile(langUri);
  const text = Buffer.from(raw).toString('utf8');
  const parseErrors: ParseError[] = [];
  const parsed = parse(text, parseErrors, {
    allowEmptyContent: false,
    allowTrailingComma: true,
    disallowComments: false,
  });

  if (parseErrors.length > 0) {
    const first = parseErrors[0];
    void vscode.window.showErrorMessage(
      `Could not update lang file ${path.basename(langUri.fsPath)}: ${printParseErrorCode(first.error)}.`
    );
    return undefined;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    void vscode.window.showErrorMessage(`Could not update lang file ${path.basename(langUri.fsPath)}: expected a JSON object.`);
    return undefined;
  }

  return { ...(parsed as Record<string, unknown>) };
}

async function exists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}
