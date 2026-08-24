import { eslintCompatPlugin } from "@oxlint/plugins";
import { requireTryCatch } from "./rules/require-try-catch.js";
import { noUnhandledThrows } from "./rules/no-unhandled-throws.js";
import { requireThrowsDeclaration } from "./rules/require-throws-declaration.js";

/**
 * Oxlint plugin enforcing the `@shkumbinhsn/try-catch` error-handling pattern.
 *
 * Register it in `.oxlintrc.json`:
 *
 * ```json
 * {
 *   "jsPlugins": ["@shkumbinhsn/try-catch-oxlint"],
 *   "rules": {
 *     "try-catch/require-throws-declaration": "error",
 *     "try-catch/require-try-catch": "warn",
 *     "try-catch/no-unhandled-throws": "error"
 *   }
 * }
 * ```
 *
 * The rules use oxlint's `createOnce` API; `eslintCompatPlugin` adds the
 * `create` methods ESLint needs, so the same plugin also loads in ESLint.
 */
const plugin = eslintCompatPlugin({
  meta: {
    name: "try-catch",
  },
  rules: {
    "require-try-catch": requireTryCatch,
    "no-unhandled-throws": noUnhandledThrows,
    "require-throws-declaration": requireThrowsDeclaration,
  },
});

export default plugin;
export { requireTryCatch, noUnhandledThrows, requireThrowsDeclaration };
