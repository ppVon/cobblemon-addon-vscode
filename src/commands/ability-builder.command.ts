import * as path from 'path';
import * as vscode from 'vscode';
import {
  abilityFileExtension,
  useTypescriptForAbilities,
} from '../core/utils';
import { pickWorkspaceFolder, writeFileIfMissing } from './command-utils';
import {
  WORKSPACE_ABILITY_TYPES_CONTENT,
  WORKSPACE_ABILITY_TYPES_PATH,
} from './ability-builder/workspace-ability-types';
import { showAbilityBuilderForm } from './ability-builder/webview';
import { buildAbilityTemplate } from './ability-builder/templates';
import {
  DEFAULT_ABILITY_BUILDER_FORM,
  type AbilityBuilderFormData,
} from './ability-builder/types';
import { validateAbilityBuilderFormData } from './ability-builder/form-validation';
import { upsertAbilityLangEntries } from './lang-utils';
import { type CommandDefinition } from './types';

export const scaffoldAbilityFileCommand: CommandDefinition = {
  id: 'cobblemonSchemaTools.scaffoldAbilityFile',
  run: async ({ scheduleValidation }) => {
    await scaffoldAbilityFile();
    scheduleValidation();
  },
};

async function scaffoldAbilityFile(): Promise<void> {
  const folder = await pickWorkspaceFolder();
  if (!folder) {
    return;
  }

  const typescriptAbilitiesEnabled = useTypescriptForAbilities();
  const formData = await showAbilityBuilderForm(
    DEFAULT_ABILITY_BUILDER_FORM,
    typescriptAbilitiesEnabled,
  );
  if (!formData) {
    return;
  }

  const validationError = validateAbilityBuilderFormData(formData);
  if (validationError) {
    void vscode.window.showErrorMessage(validationError);
    return;
  }

  const targetUri = await resolveAbilityTargetUri(folder.uri, formData);
  if (!targetUri) {
    return;
  }

  const abilityDataImportPath = typescriptAbilitiesEnabled
    ? await ensureWorkspaceAbilityTypes(folder.uri, targetUri)
    : undefined;
  const content = buildAbilityTemplate(formData, { abilityDataImportPath });
  await writeFileIfMissing(targetUri, content);

  await upsertAbilityLangEntries(
    folder.uri,
    formData.namespace,
    formData.fileId,
    formData.abilityName.trim(),
    `TODO: Add ability description for ${formData.abilityName.trim()}.`,
    'en_us',
  );

  void vscode.window.showInformationMessage(
    `Ability builder generated ${formData.namespace}:${formData.fileId}.`,
  );

  const doc = await vscode.workspace.openTextDocument(targetUri);
  await vscode.window.showTextDocument(doc);
}

async function resolveAbilityTargetUri(
  workspaceRoot: vscode.Uri,
  formData: AbilityBuilderFormData,
): Promise<vscode.Uri | undefined> {
  const namespace = formData.namespace.trim().toLowerCase();
  const fileId = formData.fileId.trim().toLowerCase();
  if (!namespace || !fileId) {
    return undefined;
  }

  const dir = vscode.Uri.joinPath(workspaceRoot, 'data', namespace, 'abilities');
  await vscode.workspace.fs.createDirectory(dir);
  return vscode.Uri.joinPath(dir, `${fileId}.${abilityFileExtension()}`);
}

async function ensureWorkspaceAbilityTypes(
  workspaceRoot: vscode.Uri,
  targetUri: vscode.Uri,
): Promise<string> {
  const helperUri = vscode.Uri.joinPath(
    workspaceRoot,
    ...WORKSPACE_ABILITY_TYPES_PATH.split('/'),
  );
  await vscode.workspace.fs.createDirectory(
    vscode.Uri.joinPath(workspaceRoot, '.cobblemon-schema-tools'),
  );

  const currentContent = await readUtf8IfExists(helperUri);
  if (currentContent !== WORKSPACE_ABILITY_TYPES_CONTENT) {
    await vscode.workspace.fs.writeFile(
      helperUri,
      Buffer.from(WORKSPACE_ABILITY_TYPES_CONTENT, 'utf8'),
    );
  }

  const relativePath = path.relative(
    path.dirname(targetUri.fsPath),
    helperUri.fsPath,
  );
  const withoutExtension = relativePath
    .replace(/\.d\.ts$/i, '')
    .replace(/\.ts$/i, '');
  return withoutExtension.startsWith('.')
    ? withoutExtension.replace(/\\/g, '/')
    : `./${withoutExtension.replace(/\\/g, '/')}`;
}

async function readUtf8IfExists(uri: vscode.Uri): Promise<string | undefined> {
  try {
    const raw = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(raw).toString('utf8');
  } catch {
    return undefined;
  }
}
