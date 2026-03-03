import * as vscode from 'vscode';

export function parseCsvIdentifiers(value: string): string[] {
  const seen = new Set<string>();
  for (const part of value.split(',')) {
    const key = part.trim().toLowerCase();
    if (!key) {
      continue;
    }
    if (!seen.has(key)) {
      seen.add(key);
    }
  }
  return Array.from(seen);
}

export function sanitizeFileComponent(value: string): string {
  const sanitized = value.toLowerCase().replace(/[^a-z0-9_.-]+/g, '_').replace(/^_+|_+$/g, '');
  return sanitized.length > 0 ? sanitized : 'entry';
}

export function appendRelativePath(baseUri: vscode.Uri, relativePath: string): vscode.Uri {
  if (!relativePath) {
    return baseUri;
  }

  return relativePath
    .split('/')
    .filter((segment) => segment.length > 0)
    .reduce((current, segment) => vscode.Uri.joinPath(current, segment), baseUri);
}

export async function writeFileIfMissing(uri: vscode.Uri, content: string): Promise<void> {
  let exists = true;
  try {
    await vscode.workspace.fs.stat(uri);
  } catch {
    exists = false;
  }

  if (exists) {
    const choice = await vscode.window.showQuickPick(['Overwrite', 'Keep Existing'], {
      title: `File already exists: ${uri.fsPath}`,
    });

    if (choice !== 'Overwrite') {
      return;
    }
  }

  await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
}

export async function pickWorkspaceFolder(): Promise<vscode.WorkspaceFolder | undefined> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (folders.length === 0) {
    void vscode.window.showErrorMessage('Open a workspace folder first.');
    return undefined;
  }

  if (folders.length === 1) {
    return folders[0];
  }

  const picked = await vscode.window.showQuickPick(
    folders.map((folder) => ({ label: folder.name, description: folder.uri.fsPath, folder })),
    { title: 'Select workspace folder' }
  );

  return picked?.folder;
}
