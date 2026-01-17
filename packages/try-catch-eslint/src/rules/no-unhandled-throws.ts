import { ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/shkumbinhasani/ts-try-catch/blob/main/docs/rules/${name}.md`
);

export const noUnhandledThrows = createRule({
  name: "no-unhandled-throws",
  meta: {
    type: "problem",
    docs: {
      description:
        "Ensure error is checked before accessing data from tryCatch()",
    },
    messages: {
      noUnhandledThrows:
        "Must check error before accessing data from tryCatch() result",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    // TODO: Implement rule logic
    // This rule should detect when data from tryCatch() is accessed
    // without first checking if error is null/undefined
    return {
      VariableDeclarator(node) {
        // Placeholder for implementation
        // Will need to track destructured [data, error] patterns
        // and ensure error is checked before data is used
      },
    };
  },
});
