import { requireTryCatch } from "./rules/require-try-catch.js";
import { noUnhandledThrows } from "./rules/no-unhandled-throws.js";
import { requireThrowsDeclaration } from "./rules/require-throws-declaration.js";

const plugin = {
  meta: {
    name: "@shkumbinhsn/try-catch-eslint",
    version: "0.0.3",
  },
  rules: {
    "require-try-catch": requireTryCatch,
    "no-unhandled-throws": noUnhandledThrows,
    "require-throws-declaration": requireThrowsDeclaration,
  },
  configs: {
    recommended: {
      plugins: ["@shkumbinhsn/try-catch-eslint"],
      rules: {
        "@shkumbinhsn/try-catch-eslint/require-try-catch": "warn",
        "@shkumbinhsn/try-catch-eslint/no-unhandled-throws": "error",
        "@shkumbinhsn/try-catch-eslint/require-throws-declaration": "error",
      },
    },
  },
};

export default plugin;
