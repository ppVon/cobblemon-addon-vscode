# Cobblemon Schema Tools

Cobblemon Schema Tools is a VS Code extension for Cobblemon content creators.  
It helps you catch data issues quickly and generate common Cobblemon files from guided forms.

## What You Can Do

- Validate your workspace data and view issues in the **Problems** panel.
- Generate a root `pack.mcmeta` with **Cobblemon: Generate pack.mcmeta**.
- Package your addon workspace as a zip with **Cobblemon: Package Addon Zip**.
- Generate custom move JS files, or opt into typed TS move files, with **Cobblemon: Move Builder Form**.
- Insert move callback snippets in JS or TS move files with **Cobblemon: Insert Move Callback**.
- Generate Pokemon starter files with **Cobblemon: Pokemon Builder Form**.
- Scaffold a data JSON file with **Cobblemon: Scaffold Data JSON File**.
- Generate a spawn pool world entry with **Cobblemon: Generate Spawn Pool World**.
- Run full checks anytime with **Cobblemon: Validate Workspace Data**.

## Quick Usage

1. Open your Cobblemon workspace in VS Code.
2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
3. Run one of the `Cobblemon:` commands.
4. Fix issues shown in **Problems** and re-run validation as needed.

## Settings

- `cobblemonSchemaTools.enableWorkspaceValidation`
- `cobblemonSchemaTools.strictWorkspaceValidation`
- `cobblemonSchemaTools.strictAssetNaming`
- `cobblemonSchemaTools.useTypescriptForMoves`
- `cobblemonSchemaTools.warnOnPokemonAssetFolderNaming`
