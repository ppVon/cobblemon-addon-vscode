import * as path from "path";
import * as vscode from "vscode";
import { parseWorkspaceJson } from "../core/json";
import { parseWorkspaceJsObject, rangeForJsNode } from "../core/js-object";
import {
  DATA_ROOT_EXCLUDE,
  getStringProperty,
  inferNamespaceFromPath,
  isPokemonAssetFolderNamingWarningEnabled,
  normalizePath,
  normalizeResourceId,
  normalizeSlug,
  strictNamingSeverity,
  workspaceWarningSeverity,
  toAnimationGroupName,
  toAssetResourceId,
  toModelResourceId,
} from "../core/utils";
import {
  addDiagnostics,
  createCustomDiagnostic,
  createParseDiagnostics,
} from "../core/diagnostics";
import {
  type LangRequirement,
  type ParsedJsonFile,
  type PoserRecord,
  type ResolverRecord,
} from "../types";
import { type CobblemonSchemaEngine } from "../schema/schema-engine";
import {
  getCobblemonDefaultResourceIndex,
  type CobblemonDefaultResourceIndex,
} from "./cobblemon-default-index";
import { validateMoveJsFile } from "./move-validation";
import {
  createMissingPackMcmetaDiagnostic,
  validatePackMcmetaFile,
} from "../pack/pack-mcmeta";

export async function runWorkspaceValidation(
  engine: CobblemonSchemaEngine,
  diagnostics: vscode.DiagnosticCollection,
  extensionUri: vscode.Uri,
  notifySuccess = false,
): Promise<void> {
  const cobblemonDefaults = getCobblemonDefaultResourceIndex(extensionUri);
  const files = await vscode.workspace.findFiles(
    "**/*.json",
    DATA_ROOT_EXCLUDE,
  );
  const moveFiles = await vscode.workspace.findFiles(
    "**/data/*/moves/**/*.js",
    DATA_ROOT_EXCLUDE,
  );
  const moveTsFiles = await vscode.workspace.findFiles(
    "**/data/*/moves/**/*.ts",
    DATA_ROOT_EXCLUDE,
  );
  const textureFiles = await vscode.workspace.findFiles(
    "**/assets/*/**/*.png",
    DATA_ROOT_EXCLUDE,
  );
  const langFiles = await vscode.workspace.findFiles(
    "**/assets/*/lang/*.json",
    DATA_ROOT_EXCLUDE,
  );

  const byUri = new Map<string, vscode.Diagnostic[]>();
  const speciesIds = new Map<string, vscode.Uri>();
  const dexEntryIds = new Set<string>();
  const poserIds = new Map<string, vscode.Uri[]>();
  const referencedPosers = new Set<string>();
  const modelIds = new Set<string>();
  const animationGroupNames = new Set<string>();
  const textureIds = new Set<string>();
  const langKeys = new Set<string>();
  const langRequirements: LangRequirement[] = [];

  const resolverRecords: ResolverRecord[] = [];
  const poserRecords: PoserRecord[] = [];
  const dexEntryRecords: Array<{ parsed: ParsedJsonFile; namespace: string }> =
    [];
  const dexEntryAdditionRecords: Array<{
    parsed: ParsedJsonFile;
    namespace: string;
  }> = [];
  const workspaceFolders = vscode.workspace.workspaceFolders ?? [];

  for (const folder of workspaceFolders) {
    await validateWorkspacePackRoot(folder, byUri);
  }

  for (const textureUri of textureFiles) {
    const textureId = toAssetResourceId(textureUri.fsPath);
    if (textureId) {
      textureIds.add(textureId);
    }
  }

  for (const langUri of langFiles) {
    const parsed = await parseWorkspaceJson(langUri);
    if (parsed.parseErrors.length > 0) {
      addDiagnostics(byUri, langUri, createParseDiagnostics(parsed));
      continue;
    }

    if (
      !parsed.value ||
      typeof parsed.value !== "object" ||
      Array.isArray(parsed.value)
    ) {
      continue;
    }

    for (const [key, value] of Object.entries(
      parsed.value as Record<string, unknown>,
    )) {
      if (typeof value === "string") {
        langKeys.add(key);
      }
    }
  }

  for (const uri of files) {
    const filePath = uri.fsPath;
    const normalized = normalizePath(filePath);

    const modelId = toModelResourceId(normalized);
    if (modelId) {
      modelIds.add(modelId);
    }

    const animationGroup = toAnimationGroupName(normalized);
    if (animationGroup) {
      animationGroupNames.add(animationGroup);
      const animationNamespace = inferNamespaceFromPath(normalized, "/assets/");
      if (animationNamespace) {
        animationGroupNames.add(`${animationNamespace}:${animationGroup}`);
      }
    }

    const resolution = engine.getSchemaForPath(filePath);
    if (!resolution) {
      continue;
    }

    const parsed = await parseWorkspaceJson(uri);
    const schemaDiagnostics = engine.validateJsonFile(
      parsed,
      resolution.schemaPath,
    );
    addDiagnostics(byUri, uri, schemaDiagnostics);

    if (
      parsed.parseErrors.length > 0 ||
      !parsed.value ||
      typeof parsed.value !== "object" ||
      Array.isArray(parsed.value)
    ) {
      continue;
    }

    const namespace =
      inferNamespaceFromPath(normalized, "/data/") ??
      inferNamespaceFromPath(normalized, "/assets/") ??
      "minecraft";
    const parsedObject = parsed.value as Record<string, unknown>;

    if (resolution.schemaPath === "schemas/species/schema.json") {
      const fileStem = path.basename(normalized, ".json");
      const speciesId = normalizeResourceId(fileStem, namespace);
      speciesIds.set(speciesId, uri);

      const speciesSlug = speciesId.split(":", 2)[1] ?? speciesId;
      langRequirements.push({
        parsed,
        key: `${namespace}.species.${speciesSlug}.name`,
        pointer: ["name"],
      });

      const pokedex = Array.isArray(parsedObject.pokedex)
        ? parsedObject.pokedex
        : [];
      for (let i = 0; i < pokedex.length; i++) {
        const entry = pokedex[i];
        if (typeof entry !== "string") {
          continue;
        }

        langRequirements.push({
          parsed,
          key: entry,
          pointer: ["pokedex", i],
        });
      }
    }

    if (resolution.schemaPath === "schemas/dex_entries/schema.json") {
      const entryId = getStringProperty(parsedObject, "id");
      if (entryId) {
        dexEntryIds.add(normalizeResourceId(entryId, namespace));
      }

      dexEntryRecords.push({ parsed, namespace });
    }

    if (resolution.schemaPath === "schemas/dex_entry_additions/schema.json") {
      dexEntryAdditionRecords.push({ parsed, namespace });
    }

    if (
      resolution.schemaPath === "schemas/bedrock_pokemon_resolvers/schema.json"
    ) {
      resolverRecords.push({ parsed, namespace, pathNorm: normalized });
    }

    if (resolution.schemaPath === "schemas/bedrock_posers/schema.json") {
      const fileStem = path.basename(normalized, ".json");
      const poserId = normalizeResourceId(fileStem, namespace);
      const isPokemonPoser = /\/assets\/[^/]+\/bedrock\/pokemon\/posers\//.test(
        normalized,
      );

      const current = poserIds.get(poserId) ?? [];
      current.push(uri);
      poserIds.set(poserId, current);

      poserRecords.push({
        parsed,
        namespace,
        pathNorm: normalized,
        poserId,
        isPokemonPoser,
      });
    }
  }

  for (const uri of [...moveFiles, ...moveTsFiles]) {
    const diags = await validateMoveJsFile(uri);
    addDiagnostics(byUri, uri, diags);
    addDiagnostics(
      byUri,
      uri,
      await validateMoveLangRequirements(uri, langKeys, cobblemonDefaults),
    );
  }

  for (const record of dexEntryRecords) {
    const diags = validateDexEntryRecord(
      record.parsed,
      record.namespace,
      speciesIds,
      cobblemonDefaults,
    );
    addDiagnostics(byUri, record.parsed.uri, diags);
  }

  for (const record of dexEntryAdditionRecords) {
    const diags = validateDexEntryAdditionRecord(
      record.parsed,
      record.namespace,
      dexEntryIds,
      cobblemonDefaults,
    );
    addDiagnostics(byUri, record.parsed.uri, diags);
  }

  for (const record of resolverRecords) {
    const diags = validateResolverRecord(
      record,
      speciesIds,
      poserIds,
      modelIds,
      textureIds,
      referencedPosers,
      cobblemonDefaults,
    );
    addDiagnostics(byUri, record.parsed.uri, diags);
  }

  for (const record of poserRecords) {
    const diags = validatePoserRecord(
      record,
      referencedPosers,
      animationGroupNames,
      cobblemonDefaults,
    );
    addDiagnostics(byUri, record.parsed.uri, diags);
  }

  for (const [poserId, uris] of poserIds.entries()) {
    if (uris.length < 2) {
      continue;
    }

    for (const uri of uris) {
      addDiagnostics(byUri, uri, [
        new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 1),
          `Poser id '${poserId}' is defined by multiple files. Resolver links may resolve unpredictably.`,
          strictNamingSeverity(),
        ),
      ]);
    }
  }

  for (const requirement of langRequirements) {
    if (
      langKeys.has(requirement.key) ||
      cobblemonDefaults.langKeys.has(requirement.key)
    ) {
      continue;
    }

    addDiagnostics(byUri, requirement.parsed.uri, [
      createCustomDiagnostic(
        requirement.parsed,
        `Lang key '${requirement.key}' was not found in any assets/*/lang/*.json file.`,
        workspaceWarningSeverity(),
        requirement.pointer,
      ),
    ]);
  }

  diagnostics.clear();
  for (const [uriString, diags] of byUri.entries()) {
    diagnostics.set(vscode.Uri.parse(uriString), diags);
  }

  if (notifySuccess) {
    const filesWithIssues = Array.from(byUri.values()).filter(
      (x) => x.length > 0,
    ).length;
    if (filesWithIssues > 0) {
      void vscode.window.showWarningMessage(
        `Cobblemon validation finished with issues in ${filesWithIssues} file(s).`,
      );
    } else {
      void vscode.window.showInformationMessage(
        "Cobblemon validation finished with no issues.",
      );
    }
  }
}

function validateResolverRecord(
  record: ResolverRecord,
  speciesIds: Map<string, vscode.Uri>,
  poserIds: Map<string, vscode.Uri[]>,
  modelIds: Set<string>,
  textureIds: Set<string>,
  referencedPosers: Set<string>,
  cobblemonDefaults: CobblemonDefaultResourceIndex,
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  const value = record.parsed.value as Record<string, unknown>;

  const fileName = path.basename(record.pathNorm, ".json");
  const dirName = path.basename(path.dirname(record.pathNorm));

  if (!/^[0-9]+_[a-z0-9_-]+$/.test(fileName)) {
    diagnostics.push(
      new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 1),
        "Resolver filename should use <order>_<name>.json.",
        strictNamingSeverity(),
      ),
    );
  }

  if (
    isPokemonAssetFolderNamingWarningEnabled() &&
    !/^[0-9]{3,4}_[a-z0-9_-]+$/.test(dirName)
  ) {
    diagnostics.push(
      new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 1),
        "Resolver directory should usually use <dex>_<species>.",
        vscode.DiagnosticSeverity.Warning,
      ),
    );
  }

  const order = typeof value.order === "number" ? value.order : undefined;
  const prefix = Number.parseInt(fileName.split("_", 1)[0] ?? "", 10);
  if (Number.isFinite(prefix) && order !== undefined && prefix !== order) {
    diagnostics.push(
      createCustomDiagnostic(
        record.parsed,
        `Filename order prefix (${prefix}) does not match JSON 'order' (${order}).`,
        strictNamingSeverity(),
        ["order"],
      ),
    );
  }

  const speciesRaw =
    getStringProperty(value, "species") ??
    getStringProperty(value, "name") ??
    getStringProperty(value, "pokeball");
  if (speciesRaw) {
    const speciesId = normalizeResourceId(speciesRaw, record.namespace);
    const speciesSlug = speciesId.split(":", 2)[1] ?? speciesId;

    if (!normalizeSlug(fileName).includes(normalizeSlug(speciesSlug))) {
      diagnostics.push(
        new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 1),
          `Resolver filename does not include species slug '${speciesSlug}'.`,
          strictNamingSeverity(),
        ),
      );
    }

    if (
      !speciesIds.has(speciesId) &&
      !cobblemonDefaults.speciesIds.has(speciesId)
    ) {
      diagnostics.push(
        createCustomDiagnostic(
          record.parsed,
          `Species id '${speciesId}' was not found in any species data file.`,
          workspaceWarningSeverity(),
          ["species"],
        ),
      );
    }
  }

  const variations = Array.isArray(value.variations) ? value.variations : [];
  for (let i = 0; i < variations.length; i++) {
    const variation = variations[i];
    if (
      !variation ||
      typeof variation !== "object" ||
      Array.isArray(variation)
    ) {
      continue;
    }

    const variationObj = variation as Record<string, unknown>;

    const poser = getStringProperty(variationObj, "poser");
    if (poser) {
      const poserId = normalizeResourceId(poser, record.namespace);
      referencedPosers.add(poserId);
      if (!poserIds.has(poserId) && !cobblemonDefaults.poserIds.has(poserId)) {
        diagnostics.push(
          createCustomDiagnostic(
            record.parsed,
            `Referenced poser '${poserId}' does not exist.`,
            vscode.DiagnosticSeverity.Error,
            ["variations", i, "poser"],
          ),
        );
      }
    }

    const model = getStringProperty(variationObj, "model");
    if (model) {
      const modelId = normalizeResourceId(model, record.namespace);
      if (!modelIds.has(modelId) && !cobblemonDefaults.modelIds.has(modelId)) {
        diagnostics.push(
          createCustomDiagnostic(
            record.parsed,
            `Referenced model '${modelId}' does not exist under assets/*/bedrock/**/models.`,
            vscode.DiagnosticSeverity.Error,
            ["variations", i, "model"],
          ),
        );
      }
    }

    const texture = variationObj.texture;
    diagnostics.push(
      ...validateTextureRef(
        record.parsed,
        texture,
        record.namespace,
        textureIds,
        ["variations", i, "texture"],
        cobblemonDefaults,
      ),
    );

    const layers = Array.isArray(variationObj.layers)
      ? variationObj.layers
      : [];
    for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
      const layer = layers[layerIndex];
      if (!layer || typeof layer !== "object" || Array.isArray(layer)) {
        continue;
      }
      const layerTexture = (layer as Record<string, unknown>).texture;
      diagnostics.push(
        ...validateTextureRef(
          record.parsed,
          layerTexture,
          record.namespace,
          textureIds,
          ["variations", i, "layers", layerIndex, "texture"],
          cobblemonDefaults,
        ),
      );
    }
  }

  return diagnostics;
}

function validateDexEntryRecord(
  parsed: ParsedJsonFile,
  namespace: string,
  speciesIds: Map<string, vscode.Uri>,
  cobblemonDefaults: CobblemonDefaultResourceIndex,
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  const value = parsed.value as Record<string, unknown>;

  const speciesIdRaw = getStringProperty(value, "speciesId");
  if (!speciesIdRaw) {
    return diagnostics;
  }

  const speciesId = normalizeResourceId(speciesIdRaw, namespace);
  if (
    !speciesIds.has(speciesId) &&
    !cobblemonDefaults.speciesIds.has(speciesId)
  ) {
    diagnostics.push(
      createCustomDiagnostic(
        parsed,
        `Species id '${speciesId}' was not found in any species data file.`,
        workspaceWarningSeverity(),
        ["speciesId"],
      ),
    );
  }

  return diagnostics;
}

function validateDexEntryAdditionRecord(
  parsed: ParsedJsonFile,
  namespace: string,
  dexEntryIds: Set<string>,
  cobblemonDefaults: CobblemonDefaultResourceIndex,
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  const value = parsed.value as Record<string, unknown>;

  const entryIdRaw = getStringProperty(value, "entryId");
  if (!entryIdRaw) {
    return diagnostics;
  }

  const entryId = normalizeResourceId(entryIdRaw, namespace);
  if (
    !dexEntryIds.has(entryId) &&
    !cobblemonDefaults.dexEntryIds.has(entryId)
  ) {
    diagnostics.push(
      createCustomDiagnostic(
        parsed,
        `Dex entry id '${entryId}' was not found in any dex_entries data file.`,
        workspaceWarningSeverity(),
        ["entryId"],
      ),
    );
  }

  return diagnostics;
}

function validatePoserRecord(
  record: PoserRecord,
  referencedPosers: Set<string>,
  animationGroupNames: Set<string>,
  cobblemonDefaults: CobblemonDefaultResourceIndex,
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  const fileStem = path.basename(record.pathNorm, ".json");

  if (record.isPokemonPoser) {
    const dirName = path.basename(path.dirname(record.pathNorm));
    if (
      isPokemonAssetFolderNamingWarningEnabled() &&
      dirName !== "special" &&
      !/^[0-9]{3,4}_[a-z0-9_-]+$/.test(dirName)
    ) {
      diagnostics.push(
        new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 1),
          "Pokemon poser directory should usually use <dex>_<species>.",
          vscode.DiagnosticSeverity.Warning,
        ),
      );
    }

    if (!/^[a-z0-9_-]+$/.test(fileStem)) {
      diagnostics.push(
        new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 1),
          "Pokemon poser filename should use lowercase snake/kebab case.",
          strictNamingSeverity(),
        ),
      );
    }

    const inSpecial = /\/bedrock\/pokemon\/posers\/special\//.test(
      record.pathNorm,
    );
    if (!inSpecial && !referencedPosers.has(record.poserId)) {
      diagnostics.push(
        new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 1),
          `Poser '${record.poserId}' is not referenced by any pokemon resolver variation.`,
          workspaceWarningSeverity(),
        ),
      );
    }
  }

  const groups = extractBedrockGroups(record.parsed.value);
  for (const group of groups) {
    const normalizedGroup = normalizeResourceId(group, record.namespace);
    const shortGroup = normalizedGroup.split(":", 2)[1] ?? normalizedGroup;

    if (
      !animationGroupNames.has(shortGroup) &&
      !animationGroupNames.has(normalizedGroup) &&
      !cobblemonDefaults.animationGroupNames.has(shortGroup) &&
      !cobblemonDefaults.animationGroupNames.has(normalizedGroup)
    ) {
      diagnostics.push(
        new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 1),
          `Animation group '${group}' referenced by poser '${record.poserId}' was not found in assets/*/bedrock/**/animations/*.animation.json.`,
          workspaceWarningSeverity(),
        ),
      );
    }
  }

  return diagnostics;
}

function validateTextureRef(
  parsed: ParsedJsonFile,
  textureValue: unknown,
  namespace: string,
  textureIds: Set<string>,
  pointer: Array<string | number>,
  cobblemonDefaults: CobblemonDefaultResourceIndex,
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];

  if (typeof textureValue === "string") {
    if (textureValue === "variable") {
      return diagnostics;
    }

    const id = normalizeResourceId(textureValue, namespace);
    if (!textureIds.has(id) && !cobblemonDefaults.textureIds.has(id)) {
      diagnostics.push(
        createCustomDiagnostic(
          parsed,
          `Texture '${id}' does not exist in assets/${namespace}.`,
          workspaceWarningSeverity(),
          pointer,
        ),
      );
    }
    return diagnostics;
  }

  if (
    !textureValue ||
    typeof textureValue !== "object" ||
    Array.isArray(textureValue)
  ) {
    return diagnostics;
  }

  const frames = (textureValue as Record<string, unknown>).frames;
  if (!Array.isArray(frames)) {
    return diagnostics;
  }

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (typeof frame !== "string") {
      continue;
    }

    const id = normalizeResourceId(frame, namespace);
    if (!textureIds.has(id) && !cobblemonDefaults.textureIds.has(id)) {
      diagnostics.push(
        createCustomDiagnostic(
          parsed,
          `Animated texture frame '${id}' does not exist in assets/${namespace}.`,
          workspaceWarningSeverity(),
          [...pointer, "frames", i],
        ),
      );
    }
  }

  return diagnostics;
}

function extractBedrockGroups(value: unknown): string[] {
  const groups = new Set<string>();
  const regex = /q\.bedrock(?:_[a-zA-Z]+)?\('([^']+)'\s*,\s*'[^']+'/g;

  const visit = (item: unknown): void => {
    if (typeof item === "string") {
      let match: RegExpExecArray | null;
      while ((match = regex.exec(item)) !== null) {
        groups.add(match[1]);
      }
      return;
    }

    if (Array.isArray(item)) {
      for (const child of item) {
        visit(child);
      }
      return;
    }

    if (item && typeof item === "object") {
      for (const child of Object.values(item as Record<string, unknown>)) {
        visit(child);
      }
    }
  };

  visit(value);
  return Array.from(groups);
}

async function validateWorkspacePackRoot(
  folder: vscode.WorkspaceFolder,
  byUri: Map<string, vscode.Diagnostic[]>,
): Promise<void> {
  if (!(await hasDirectory(vscode.Uri.joinPath(folder.uri, "data")))) {
    return;
  }

  const packUri = vscode.Uri.joinPath(folder.uri, "pack.mcmeta");
  if (!(await pathExists(packUri))) {
    addDiagnostics(byUri, packUri, [
      createMissingPackMcmetaDiagnostic(workspaceWarningSeverity()),
    ]);
    return;
  }

  const diagnostics = await validatePackMcmetaFile(packUri);
  addDiagnostics(byUri, packUri, diagnostics);
}

async function hasDirectory(uri: vscode.Uri): Promise<boolean> {
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    return stat.type === vscode.FileType.Directory;
  } catch {
    return false;
  }
}

async function pathExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

async function validateMoveLangRequirements(
  uri: vscode.Uri,
  langKeys: Set<string>,
  cobblemonDefaults: CobblemonDefaultResourceIndex,
): Promise<vscode.Diagnostic[]> {
  const parsed = await parseWorkspaceJsObject(uri);
  if (parsed.parseErrors.length > 0 || !parsed.root) {
    return [];
  }

  const normalized = normalizePath(uri.fsPath);
  const namespace = inferNamespaceFromPath(normalized, "/data/") ?? "minecraft";
  const moveStem = path.basename(normalized, path.extname(normalized));
  const moveSlug = normalizeSlug(moveStem);
  if (!moveSlug) {
    return [];
  }

  const nameMember = parsed.root.members.find(
    (
      member,
    ): member is Extract<typeof parsed.root.members[number], { keyNode: unknown }> =>
      (member.kind === "property" || member.kind === "method") &&
      member.key === "name",
  );
  const range = rangeForJsNode(
    parsed,
    nameMember?.keyNode ?? parsed.root.node,
  );

  const diagnostics: vscode.Diagnostic[] = [];
  const nameKey = `${namespace}.move.${moveSlug}`;
  const descKey = `${namespace}.move.${moveSlug}.desc`;

  if (!langKeys.has(nameKey) && !cobblemonDefaults.langKeys.has(nameKey)) {
    diagnostics.push(
      createWorkspaceWarningDiagnostic(
        range,
        `Lang key '${nameKey}' was not found in any assets/*/lang/*.json file.`,
      ),
    );
  }

  if (!langKeys.has(descKey) && !cobblemonDefaults.langKeys.has(descKey)) {
    diagnostics.push(
      createWorkspaceWarningDiagnostic(
        range,
        `Lang key '${descKey}' was not found in any assets/*/lang/*.json file.`,
      ),
    );
  }

  return diagnostics;
}

function createWorkspaceWarningDiagnostic(
  range: vscode.Range,
  message: string,
): vscode.Diagnostic {
  const diagnostic = new vscode.Diagnostic(
    range,
    message,
    workspaceWarningSeverity(),
  );
  diagnostic.source = "cobblemon-schema-tools";
  return diagnostic;
}
