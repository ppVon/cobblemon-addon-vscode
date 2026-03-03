import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  COBBLEMON_TYPES,
  type PokemonBuilderFormData,
} from './types';
import {
  isPokemonBuilderFormData,
  validatePokemonBuilderFormData,
} from './form-validation';

const FORM_TEMPLATE_PATH = path.join(__dirname, 'pokemon-builder.form.html');

export async function showPokemonBuilderForm(initial: PokemonBuilderFormData): Promise<PokemonBuilderFormData | undefined> {
  const panel = vscode.window.createWebviewPanel(
    'cobblemonPokemonBuilder',
    'Cobblemon Pokemon Builder',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: false,
    }
  );

  const nonce = createNonce();
  panel.webview.html = renderPokemonBuilderWebviewHtml(panel.webview, initial, nonce);

  return await new Promise<PokemonBuilderFormData | undefined>((resolve) => {
    const disposables: vscode.Disposable[] = [];
    let settled = false;

    const finish = (value: PokemonBuilderFormData | undefined): void => {
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
      })
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

        if (message.type !== 'submit' || !isPokemonBuilderFormData(message.data)) {
          return;
        }

        const error = validatePokemonBuilderFormData(message.data);
        if (error) {
          void panel.webview.postMessage({ type: 'error', message: error });
          return;
        }

        finish(message.data);
        panel.dispose();
      })
    );
  });
}

function renderPokemonBuilderWebviewHtml(webview: vscode.Webview, initial: PokemonBuilderFormData, nonce: string): string {
  const template = fs.readFileSync(FORM_TEMPLATE_PATH, 'utf8');
  const initialJson = JSON.stringify(initial).replace(/</g, '\\u003c');
  const typeOptions = COBBLEMON_TYPES.map((type) => `<option value="${type}">${type}</option>`).join('');
  const secondaryTypeOptions = `<option value="">(none)</option>${typeOptions}`;

  return template
    .replaceAll('__CSP_SOURCE__', webview.cspSource)
    .replaceAll('__NONCE__', nonce)
    .replaceAll('__TYPE_OPTIONS__', typeOptions)
    .replaceAll('__SECONDARY_TYPE_OPTIONS__', secondaryTypeOptions)
    .replaceAll('__INITIAL_JSON__', initialJson)
    .replaceAll('__COBBLEMON_TYPES_JSON__', JSON.stringify(COBBLEMON_TYPES));
}

function createNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
