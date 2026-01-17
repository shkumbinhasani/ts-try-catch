import { requireTryCatch } from "./rules/require-try-catch";
import { noUnhandledThrows } from "./rules/no-unhandled-throws";

const plugin = {
  meta: {
    name: "@shkumbinhsn/try-catch-eslint",
    version: "0.0.1",
  },
  rules: {
    "require-try-catch": requireTryCatch,
    "no-unhandled-throws": noUnhandledThrows,
  },
  configs: {
    recommended: {
      plugins: ["@shkumbinhsn/try-catch-eslint"],
      rules: {
        "@shkumbinhsn/try-catch-eslint/require-try-catch": "warn",
        "@shkumbinhsn/try-catch-eslint/no-unhandled-throws": "error",
      },
    },
  },
};

export = plugin;
