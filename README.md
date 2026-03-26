# Cobblemon Schema Tools

Cobblemon Schema Tools is a VS Code extension for building Cobblemon addons and datapacks.

It is meant to make addon work easier for beginners by:

- generating common files from forms
- checking your files for mistakes
- helping you package your addon when you are ready to test it

## What It Helps With

- Custom move files
- Pokemon starter assets and species files
- Cobblemon data JSON files
- `pack.mcmeta`
- Workspace validation through the **Problems** panel
- Packaging your addon into a zip

## Recommended Workflow

1. Open your addon folder in VS Code.
   This should be the folder that contains your addon files, such as `data/`, `assets/`, and `pack.mcmeta`.
2. Open the **Command Palette** with `Ctrl+Shift+P` / `Cmd+Shift+P`.
3. Run **Cobblemon: Generate pack.mcmeta** if your addon does not have one yet.
4. Use the builder commands to create moves, Pokemon files, or other Cobblemon data.
5. Open the **Problems** panel with `Ctrl+Shift+M` / `Cmd+Shift+M` and fix any errors or warnings that show up.
6. Run **Cobblemon: Validate Workspace Data** anytime you want to re-check everything.
7. Run **Cobblemon: Package Addon Zip** when you are ready to test or share your addon.

## Commands

- **Cobblemon: Validate Workspace Data**
  Checks your workspace files and shows issues in the **Problems** panel.
- **Cobblemon: Generate pack.mcmeta**
  Creates a root `pack.mcmeta` file with a sensible default description and pack format values.
- **Cobblemon: Package Addon Zip**
  Creates a zip of your addon that is ready to test or share.
- **Cobblemon: Move Builder Form**
  Creates a custom move file from a guided form and adds default `en_us` move name and description keys.
- **Cobblemon: Insert Move Callback**
  Inserts common callback snippets into a move file.
- **Cobblemon: Pokemon Builder Form**
  Creates starter Pokemon asset and data files.
- **Cobblemon: Scaffold Data JSON File**
  Creates a new Cobblemon data JSON file from a supported schema.
- **Cobblemon: Generate Spawn Pool World**
  Creates a spawn pool world entry.

## Important Notes

- If your addon has a `data/` folder, it should also have a valid `pack.mcmeta` at the workspace root.
- TypeScript move files are only for authoring help in the editor.
- Cobblemon does not load `.ts` move files directly.
- If you use TypeScript moves, you must use **Cobblemon: Package Addon Zip** before testing in-game. The packaging step converts move `.ts` files into packaged `.js` move files.

## Settings

- `cobblemonSchemaTools.enableWorkspaceValidation`
  Turns automatic workspace validation on or off.
- `cobblemonSchemaTools.strictWorkspaceValidation`
  Treats warnings as errors.
- `cobblemonSchemaTools.strictAssetNaming`
  Makes resolver and poser naming issues stricter.
- `cobblemonSchemaTools.useTypescriptForMoves`
  Lets the move builder create `.ts` move files instead of `.js`.
- `cobblemonSchemaTools.warnOnPokemonAssetFolderNaming`
  Shows warnings when Pokemon asset folders do not follow the usual naming pattern.
