import * as vscode from 'vscode';
import { parseWorkspaceJson } from '../core/json';
import {
  createCustomDiagnostic,
  createParseDiagnostics,
} from '../core/diagnostics';

export const COBBLEMON_PACK_MCMETA_DEFAULTS = {
  cobblemonVersion: '1.7.3',
  cobblemonReleaseDate: '2026-01-31',
  minecraftVersion: '1.21.1',
  packFormat: 48,
  supportedFormats: {
    min_inclusive: 34,
    max_inclusive: 48,
  },
  description: 'Cobblemon addon datapack',
} as const;

export interface PackMcmetaData {
  pack: {
    pack_format: number;
    supported_formats?:
      | number
      | [number, number]
      | {
          min_inclusive?: number;
          max_inclusive?: number;
        };
    description: string | Record<string, unknown> | unknown[];
  };
}

export function buildDefaultPackMcmeta(
  description: string = COBBLEMON_PACK_MCMETA_DEFAULTS.description,
): string {
  const content: PackMcmetaData = {
    pack: {
      pack_format: COBBLEMON_PACK_MCMETA_DEFAULTS.packFormat,
      supported_formats: {
        min_inclusive:
          COBBLEMON_PACK_MCMETA_DEFAULTS.supportedFormats.min_inclusive,
        max_inclusive:
          COBBLEMON_PACK_MCMETA_DEFAULTS.supportedFormats.max_inclusive,
      },
      description,
    },
  };

  return JSON.stringify(content, null, 2) + '\n';
}

export async function validatePackMcmetaFile(
  uri: vscode.Uri,
): Promise<vscode.Diagnostic[]> {
  const parsed = await parseWorkspaceJson(uri);
  if (parsed.parseErrors.length > 0) {
    return createParseDiagnostics(parsed);
  }

  const diagnostics: vscode.Diagnostic[] = [];
  const root = parsed.value;
  if (!isRecord(root)) {
    diagnostics.push(
      createCustomDiagnostic(
        parsed,
        'pack.mcmeta must be a JSON object.',
        vscode.DiagnosticSeverity.Error,
        [],
      ),
    );
    return diagnostics;
  }

  const pack = root.pack;
  if (!isRecord(pack)) {
    diagnostics.push(
      createCustomDiagnostic(
        parsed,
        'pack.mcmeta must contain a pack object.',
        vscode.DiagnosticSeverity.Error,
        ['pack'],
      ),
    );
    return diagnostics;
  }

  const packFormat = pack.pack_format;
  if (!Number.isInteger(packFormat) || Number(packFormat) < 1) {
    diagnostics.push(
      createCustomDiagnostic(
        parsed,
        'pack.pack_format must be a positive integer.',
        vscode.DiagnosticSeverity.Error,
        ['pack', 'pack_format'],
      ),
    );
  }

  const description = pack.description;
  if (
    typeof description !== 'string' &&
    !isRecord(description) &&
    !Array.isArray(description)
  ) {
    diagnostics.push(
      createCustomDiagnostic(
        parsed,
        'pack.description must be a string or text-component-like value.',
        vscode.DiagnosticSeverity.Error,
        ['pack', 'description'],
      ),
    );
  }

  if (pack.supported_formats !== undefined) {
    const supportedFormatsError = validateSupportedFormats(pack.supported_formats);
    if (supportedFormatsError) {
      diagnostics.push(
        createCustomDiagnostic(
          parsed,
          supportedFormatsError,
          vscode.DiagnosticSeverity.Error,
          ['pack', 'supported_formats'],
        ),
      );
    }
  }

  return diagnostics;
}

export function createMissingPackMcmetaDiagnostic(
  severity = vscode.DiagnosticSeverity.Warning,
): vscode.Diagnostic {
  const diagnostic = new vscode.Diagnostic(
    new vscode.Range(0, 0, 0, 1),
    'Datapack root is missing pack.mcmeta.',
    severity,
  );
  diagnostic.source = 'cobblemon-schema-tools';
  return diagnostic;
}

function validateSupportedFormats(value: unknown): string | undefined {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 1
      ? undefined
      : 'pack.supported_formats number must be a positive integer.';
  }

  if (Array.isArray(value)) {
    if (value.length !== 2) {
      return 'pack.supported_formats array must contain exactly two integers.';
    }

    const min = value[0];
    const max = value[1];
    if (!Number.isInteger(min) || !Number.isInteger(max)) {
      return 'pack.supported_formats array values must be integers.';
    }
    if (Number(min) < 1 || Number(max) < Number(min)) {
      return 'pack.supported_formats array must use positive integers where max >= min.';
    }
    return undefined;
  }

  if (!isRecord(value)) {
    return 'pack.supported_formats must be a number, a two-number array, or an object.';
  }

  const min = value.min_inclusive;
  const max = value.max_inclusive;
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    return 'pack.supported_formats object must include integer min_inclusive and max_inclusive values.';
  }
  if (Number(min) < 1 || Number(max) < Number(min)) {
    return 'pack.supported_formats object must use positive integers where max_inclusive >= min_inclusive.';
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
