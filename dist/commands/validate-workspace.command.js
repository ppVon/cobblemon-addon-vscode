"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateWorkspaceCommand = void 0;
const workspace_validation_1 = require("../validation/workspace-validation");
exports.validateWorkspaceCommand = {
    id: 'cobblemonSchemaTools.validateWorkspace',
    run: async ({ engine, diagnostics }) => {
        await (0, workspace_validation_1.runWorkspaceValidation)(engine, diagnostics, true);
    },
};
//# sourceMappingURL=validate-workspace.command.js.map