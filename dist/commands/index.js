"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommands = registerCommands;
const vscode = __importStar(require("vscode"));
const generate_spawn_pool_world_command_1 = require("./generate-spawn-pool-world.command");
const pokemon_builder_command_1 = require("./pokemon-builder.command");
const scaffold_data_file_command_1 = require("./scaffold-data-file.command");
const validate_workspace_command_1 = require("./validate-workspace.command");
const COMMAND_DEFINITIONS = [
    validate_workspace_command_1.validateWorkspaceCommand,
    pokemon_builder_command_1.scaffoldPokemonAssetsCommand,
    scaffold_data_file_command_1.scaffoldDataFileCommand,
    generate_spawn_pool_world_command_1.generateSpawnPoolWorldCommand,
];
function registerCommands(extensionContext, commandContext) {
    const fullContext = {
        extensionContext,
        ...commandContext,
    };
    for (const command of COMMAND_DEFINITIONS) {
        extensionContext.subscriptions.push(vscode.commands.registerCommand(command.id, async () => {
            await command.run(fullContext);
        }));
    }
}
//# sourceMappingURL=index.js.map