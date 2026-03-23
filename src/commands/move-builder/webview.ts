import * as vscode from 'vscode';
import formTemplate from './move-builder.form.html';
import {
  MOVE_BUILDER_BOOST_KEYS,
  MOVE_BUILDER_CATEGORIES,
  MOVE_BUILDER_CONTEST_TYPES,
  MOVE_BUILDER_FLAGS,
  MOVE_BUILDER_PSEUDO_WEATHERS,
  MOVE_BUILDER_SIDE_CONDITIONS,
  MOVE_BUILDER_SLOT_CONDITIONS,
  MOVE_BUILDER_STATUS_CODES,
  MOVE_BUILDER_TERRAINS,
  MOVE_BUILDER_TARGETS,
  MOVE_BUILDER_TYPES,
  MOVE_BUILDER_VOLATILES,
  MOVE_BUILDER_WEATHERS,
  type MoveBuilderFormData,
} from './types';
import {
  isMoveBuilderFormData,
  validateMoveBuilderFormData,
} from './form-validation';

export async function showMoveBuilderForm(
  initial: MoveBuilderFormData,
): Promise<MoveBuilderFormData | undefined> {
  const panel = vscode.window.createWebviewPanel(
    'cobblemonMoveBuilder',
    'Cobblemon Move Builder',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: false,
    },
  );

  const nonce = createNonce();
  panel.webview.html = renderMoveBuilderWebviewHtml(panel.webview, initial, nonce);

  return await new Promise<MoveBuilderFormData | undefined>((resolve) => {
    const disposables: vscode.Disposable[] = [];
    let settled = false;

    const finish = (value: MoveBuilderFormData | undefined): void => {
      if (settled) {
        return;
      }
      settled = true;
      for (const disposable of disposables) {
        disposable.dispose();
      }
      resolve(value);
    };

    disposables.push(
      panel.onDidDispose(() => {
        finish(undefined);
      }),
    );

    disposables.push(
      panel.webview.onDidReceiveMessage((rawMessage: unknown) => {
        if (!rawMessage || typeof rawMessage !== 'object') {
          return;
        }

        const message = rawMessage as { type?: string; data?: unknown };
        if (message.type === 'cancel') {
          finish(undefined);
          panel.dispose();
          return;
        }

        if (message.type !== 'submit' || !isMoveBuilderFormData(message.data)) {
          return;
        }

        const error = validateMoveBuilderFormData(message.data);
        if (error) {
          void panel.webview.postMessage({ type: 'error', message: error });
          return;
        }

        finish(message.data);
        panel.dispose();
      }),
    );
  });
}

function renderMoveBuilderWebviewHtml(
  webview: vscode.Webview,
  initial: MoveBuilderFormData,
  nonce: string,
): string {
  const config = {
    categories: MOVE_BUILDER_CATEGORIES,
    types: MOVE_BUILDER_TYPES,
    targets: MOVE_BUILDER_TARGETS,
    contestTypes: MOVE_BUILDER_CONTEST_TYPES,
    flags: MOVE_BUILDER_FLAGS,
    statuses: MOVE_BUILDER_STATUS_CODES,
    volatiles: MOVE_BUILDER_VOLATILES,
    sideConditions: MOVE_BUILDER_SIDE_CONDITIONS,
    slotConditions: MOVE_BUILDER_SLOT_CONDITIONS,
    pseudoWeathers: MOVE_BUILDER_PSEUDO_WEATHERS,
    terrains: MOVE_BUILDER_TERRAINS,
    weathers: MOVE_BUILDER_WEATHERS,
    boostKeys: MOVE_BUILDER_BOOST_KEYS,
  };

  return formTemplate
    .replaceAll('__CSP_SOURCE__', webview.cspSource)
    .replaceAll('__NONCE__', nonce)
    .replaceAll(
      '__INITIAL_JSON__',
      JSON.stringify(initial).replace(/</g, '\\u003c'),
    )
    .replaceAll(
      '__CONFIG_JSON__',
      JSON.stringify(config).replace(/</g, '\\u003c'),
    );
}

function createNonce(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
