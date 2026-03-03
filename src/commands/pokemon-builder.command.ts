import * as path from 'path';
import * as vscode from 'vscode';
import { type CommandDefinition } from './types';
import {
  appendRelativePath,
  parseCsvIdentifiers,
  pickWorkspaceFolder,
  sanitizeFileComponent,
  writeFileIfMissing,
} from './command-utils';
import { normalizeResourceId } from '../core/utils';
import { upsertSpeciesLangEntries } from './lang-utils';
import {
  DEFAULT_POKEMON_BUILDER_FORM,
  type PokemonBuilderTemplateArgs,
} from './pokemon-builder/types';
import { validatePokemonBuilderFormData } from './pokemon-builder/form-validation';
import { showPokemonBuilderForm } from './pokemon-builder/webview';
import {
  buildPokemonPoserTemplate,
  buildPokemonResolverTemplate,
  buildPokemonSpeciesTemplate,
} from './pokemon-builder/templates';

export const scaffoldPokemonAssetsCommand: CommandDefinition = {
  id: 'cobblemonSchemaTools.scaffoldPokemonAssets',
  run: async ({ scheduleValidation }) => {
    await scaffoldPokemonAssets();
    scheduleValidation();
  },
};

async function scaffoldPokemonAssets(): Promise<void> {
  const folder = await pickWorkspaceFolder();
  if (!folder) {
    return;
  }

  const formData = await showPokemonBuilderForm(DEFAULT_POKEMON_BUILDER_FORM);
  if (!formData) {
    return;
  }

  const validationError = validatePokemonBuilderFormData(formData);
  if (validationError) {
    void vscode.window.showErrorMessage(validationError);
    return;
  }

  const namespace = formData.namespace.trim().toLowerCase();
  const speciesName = formData.speciesName.trim();
  const speciesId = formData.speciesId.trim().toLowerCase();
  const dexRaw = formData.dexNumber.trim();
  const dexNumber = Number.parseInt(dexRaw, 10);
  const primaryType = formData.primaryType.trim().toLowerCase();
  const secondaryType = formData.secondaryType.trim().toLowerCase() || undefined;
  const speciesSubfolder = formData.speciesSubfolder.trim();
  const dexEntryGroup = formData.dexEntryGroup.trim();
  const featureKeys = formData.includeFeatures ? parseCsvIdentifiers(formData.featureKeys) : [];

  const dex = dexRaw.padStart(4, '0');
  const folderName = `${dex}_${speciesId}`;

  const templateArgs: PokemonBuilderTemplateArgs = {
    namespace,
    speciesId,
    speciesName,
    dexNumber,
    folderName,
    primaryType,
    secondaryType,
    includeFlight: formData.includeFlight,
    includeSwim: formData.includeSwim,
    includeMountLand: formData.includeMountLand,
    includeMountAir: formData.includeMountAir,
    includeMountLiquid: formData.includeMountLiquid,
    includeShiny: formData.includeShiny,
    featureKeys,
  };

  const assetsRoot = vscode.Uri.joinPath(folder.uri, 'assets', namespace, 'bedrock', 'pokemon');
  const poserDir = vscode.Uri.joinPath(assetsRoot, 'posers', folderName);
  const resolverDir = vscode.Uri.joinPath(assetsRoot, 'resolvers', folderName);
  await vscode.workspace.fs.createDirectory(poserDir);
  await vscode.workspace.fs.createDirectory(resolverDir);

  const poserUri = vscode.Uri.joinPath(poserDir, `${speciesId}.json`);
  const resolverUri = vscode.Uri.joinPath(resolverDir, `0_${speciesId}_base.json`);

  const speciesBaseDir = vscode.Uri.joinPath(folder.uri, 'data', namespace, 'species');
  const speciesDir = appendRelativePath(speciesBaseDir, speciesSubfolder);
  await vscode.workspace.fs.createDirectory(speciesDir);
  const speciesUri = vscode.Uri.joinPath(speciesDir, `${speciesId}.json`);

  const createdUris: vscode.Uri[] = [speciesUri, resolverUri, poserUri];
  await writeFileIfMissing(speciesUri, JSON.stringify(buildPokemonSpeciesTemplate(templateArgs), null, 2) + '\n');
  await writeFileIfMissing(resolverUri, JSON.stringify(buildPokemonResolverTemplate(templateArgs), null, 2) + '\n');
  await writeFileIfMissing(poserUri, JSON.stringify(buildPokemonPoserTemplate(templateArgs), null, 2) + '\n');

  if (formData.includeLangData) {
    const langCode = formData.langCode.trim().toLowerCase();
    const langDescription = formData.langDescription.trim() || `TODO: Add Pokedex description for ${speciesName}.`;
    const langUri = await upsertSpeciesLangEntries(
      folder.uri,
      namespace,
      speciesId,
      speciesName,
      langDescription,
      langCode
    );
    if (langUri) {
      createdUris.push(langUri);
    }
  }

  if (formData.includeDexData) {
    const normalizedDexId = normalizeResourceId(formData.dexAdditionDexId.trim().toLowerCase(), namespace);
    const dexEntryDir = appendRelativePath(vscode.Uri.joinPath(folder.uri, 'data', namespace, 'dex_entries'), dexEntryGroup);
    await vscode.workspace.fs.createDirectory(dexEntryDir);
    const dexEntryUri = vscode.Uri.joinPath(dexEntryDir, `${speciesId}.json`);
    createdUris.push(dexEntryUri);
    await writeFileIfMissing(
      dexEntryUri,
      JSON.stringify(
        {
          id: `${namespace}:${speciesId}`,
          speciesId: `${namespace}:${speciesId}`,
          displayAspects: [],
          conditionAspects: [],
          forms: [
            {
              displayForm: 'Normal',
              unlockForms: ['Normal'],
            },
          ],
          variations: [],
        },
        null,
        2
      ) + '\n'
    );

    const dexAdditionsDir = vscode.Uri.joinPath(folder.uri, 'data', namespace, 'dex_additions');
    await vscode.workspace.fs.createDirectory(dexAdditionsDir);
    const dexAdditionFileKey = sanitizeFileComponent(normalizedDexId);
    const dexAdditionUri = vscode.Uri.joinPath(dexAdditionsDir, `${speciesId}_${dexAdditionFileKey}.json`);
    createdUris.push(dexAdditionUri);
    await writeFileIfMissing(
      dexAdditionUri,
      JSON.stringify(
        {
          dexId: normalizedDexId,
          entries: [`${namespace}:${speciesId}`],
        },
        null,
        2
      ) + '\n'
    );
  }

  if (featureKeys.length > 0) {
    const featuresDir = vscode.Uri.joinPath(folder.uri, 'data', namespace, 'species_features');
    const assignmentsDir = vscode.Uri.joinPath(folder.uri, 'data', namespace, 'species_feature_assignments');
    await vscode.workspace.fs.createDirectory(featuresDir);
    await vscode.workspace.fs.createDirectory(assignmentsDir);

    for (const key of featureKeys) {
      const providerUri = vscode.Uri.joinPath(featuresDir, `${key}.json`);
      const providerTemplate = {
        type: 'flag',
        keys: [key],
        default: false,
        visible: true,
      };
      createdUris.push(providerUri);
      await writeFileIfMissing(providerUri, JSON.stringify(providerTemplate, null, 2) + '\n');
    }

    const assignmentUri = vscode.Uri.joinPath(assignmentsDir, `${speciesId}_features.json`);
    createdUris.push(assignmentUri);
    await writeFileIfMissing(
      assignmentUri,
      JSON.stringify(
        {
          pokemon: [`${namespace}:${speciesId}`],
          features: featureKeys,
        },
        null,
        2
      ) + '\n'
    );
  }

  if (formData.includeSpeciesAddition) {
    const additionsDir = vscode.Uri.joinPath(folder.uri, 'data', namespace, 'species_additions');
    await vscode.workspace.fs.createDirectory(additionsDir);
    const additionsUri = vscode.Uri.joinPath(additionsDir, `${speciesId}_builder_patch.json`);
    createdUris.push(additionsUri);
    await writeFileIfMissing(
      additionsUri,
      JSON.stringify(
        {
          target: `${namespace}:${speciesId}`,
          features: featureKeys,
        },
        null,
        2
      ) + '\n'
    );
  }

  void vscode.window.showInformationMessage(`Pokemon builder generated templates for ${namespace}:${speciesId}.`);

  const openChoice = await vscode.window.showQuickPick(
    createdUris.map((uri) => ({
      label: path.relative(folder.uri.fsPath, uri.fsPath),
      description: uri.fsPath,
      uri,
    })),
    {
      title: 'Pokemon Builder Output',
      placeHolder: 'Select a generated file to open (or press Escape).',
    }
  );

  if (openChoice) {
    const doc = await vscode.workspace.openTextDocument(openChoice.uri);
    await vscode.window.showTextDocument(doc);
  }
}
