import { ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/shkumbinhasani/ts-try-catch/blob/main/docs/rules/${name}.md`
);

export const requireTryCatch = createRule({
  name: "require-try-catch",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require functions with Throws<> return types to be wrapped in tryCatch()",
    },
    messages: {
      requireTryCatch:
        "Function with Throws<> return type should be wrapped in tryCatch()",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    // TODO: Implement rule logic
    // This rule should detect when a function that returns Throws<T>
    // is called without being wrapped in tryCatch()
    return {
      CallExpression(node) {
        // Placeholder for implementation
        // Will need TypeScript type checker to inspect return types
      },
    };
  },
});
