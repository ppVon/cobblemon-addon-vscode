import * as vscode from 'vscode';
import formTemplate from './ability-builder.form.html';
import {
  isAbilityBuilderFormData,
  validateAbilityBuilderFormData,
} from './form-validation';
import {
  ABILITY_BUILDER_FLAGS,
  ABILITY_BUILDER_NONSTANDARD_VALUES,
  type AbilityBuilderFormData,
} from './types';

export async function showAbilityBuilderForm(
  initial: AbilityBuilderFormData,
  useTypescriptForAbilities: boolean,
): Promise<AbilityBuilderFormData | undefined> {
  const panel = vscode.window.createWebviewPanel(
    'cobblemonAbilityBuilder',
    'Cobblemon Ability Builder',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: false,
    },
  );

  const nonce = createNonce();
  panel.webview.html = renderAbilityBuilderWebviewHtml(
    panel.webview,
    initial,
    nonce,
    useTypescriptForAbilities,
  );

  return await new Promise<AbilityBuilderFormData | undefined>((resolve) => {
    const disposables: vscode.Disposable[] = [];
    let settled = false;

    const finish = (value: AbilityBuilderFormData | undefined): void => {
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

        if (
          message.type !== 'submit' ||
          !isAbilityBuilderFormData(message.data)
        ) {
          return;
        }

        const error = validateAbilityBuilderFormData(message.data);
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

function renderAbilityBuilderWebviewHtml(
  webview: vscode.Webview,
  initial: AbilityBuilderFormData,
  nonce: string,
  useTypescriptForAbilities: boolean,
): string {
  return formTemplate
    .replaceAll('__CSP_SOURCE__', webview.cspSource)
    .replaceAll('__NONCE__', nonce)
    .replaceAll(
      '__INITIAL_DATA__',
      JSON.stringify(initial).replace(/</g, '\\u003c'),
    )
    .replaceAll(
      '__ABILITY_FLAGS__',
      JSON.stringify(ABILITY_BUILDER_FLAGS).replace(/</g, '\\u003c'),
    )
    .replaceAll(
      '__ABILITY_NONSTANDARD_VALUES__',
      JSON.stringify(ABILITY_BUILDER_NONSTANDARD_VALUES).replace(
        /</g,
        '\\u003c',
      ),
    )
    .replaceAll(
      '__USE_TYPESCRIPT_FOR_ABILITIES__',
      JSON.stringify(useTypescriptForAbilities),
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
