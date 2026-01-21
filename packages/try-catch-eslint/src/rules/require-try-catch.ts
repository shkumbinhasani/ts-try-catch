import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import * as ts from "typescript";

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/shkumbinhasani/ts-try-catch/blob/main/docs/rules/${name}.md`
);

/**
 * Checks if a type contains Throws<T> in its structure
 */
function hasThrowsType(type: ts.Type, checker: ts.TypeChecker): boolean {
  const typeString = checker.typeToString(type);

  // Check if the type string contains "Throws<"
  if (typeString.includes("Throws<")) {
    return true;
  }

  // Check intersection types
  if (type.isIntersection()) {
    return type.types.some((t) => hasThrowsType(t, checker));
  }

  // Check union types
  if (type.isUnion()) {
    return type.types.some((t) => hasThrowsType(t, checker));
  }

  // Check if type has the error symbol property (phantom type marker)
  const properties = type.getProperties();
  for (const prop of properties) {
    if (prop.getName().includes("__@error")) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a node is inside a tryCatch() call
 */
function isInsideTryCatch(node: TSESTree.Node): boolean {
  let current: TSESTree.Node | undefined = node.parent;

  while (current) {
    if (
      current.type === "CallExpression" &&
      current.callee.type === "Identifier" &&
      current.callee.name === "tryCatch"
    ) {
      return true;
    }

    // Check if we're inside the callback argument to tryCatch
    if (
      current.type === "ArrowFunctionExpression" ||
      current.type === "FunctionExpression"
    ) {
      const parent = current.parent;
      if (
        parent?.type === "CallExpression" &&
        parent.callee.type === "Identifier" &&
        parent.callee.name === "tryCatch"
      ) {
        return true;
      }
    }

    current = current.parent;
  }

  return false;
}

export const requireTryCatch = createRule({
  name: "require-try-catch",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require functions with Throws<> return types to be wrapped in tryCatch()",
    },
    hasSuggestions: true,
    messages: {
      requireTryCatch:
        "Function '{{name}}' has a Throws<> return type and should be wrapped in tryCatch()",
      suggestWrapInTryCatch:
        "Wrap in tryCatch(() => {{name}}())",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils.getParserServices(context);
    const checker = services.program.getTypeChecker();
    const sourceCode = context.sourceCode;

    return {
      CallExpression(node) {
        // Skip if already inside tryCatch
        if (isInsideTryCatch(node)) {
          return;
        }

        // Skip if this IS the tryCatch call
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "tryCatch"
        ) {
          return;
        }

        // Skip tc() calls - they're for declaring throws, not catching
        if (node.callee.type === "Identifier" && node.callee.name === "tc") {
          return;
        }

        // Skip mightThrow() calls - they're for declaring throws
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.property.type === "Identifier" &&
          node.callee.property.name === "mightThrow"
        ) {
          return;
        }

        // Get the TypeScript node
        const tsNode = services.esTreeNodeToTSNodeMap.get(node);
        const signature = checker.getResolvedSignature(
          tsNode as ts.CallExpression
        );

        if (!signature) {
          return;
        }

        const returnType = checker.getReturnTypeOfSignature(signature);

        if (hasThrowsType(returnType, checker)) {
          const calleeName =
            node.callee.type === "Identifier"
              ? node.callee.name
              : node.callee.type === "MemberExpression" &&
                  node.callee.property.type === "Identifier"
                ? node.callee.property.name
                : "function";

          const callText = sourceCode.getText(node);

          context.report({
            node,
            messageId: "requireTryCatch",
            data: {
              name: calleeName,
            },
            suggest: [
              {
                messageId: "suggestWrapInTryCatch",
                data: { name: calleeName },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                fix(fixer: any) {
                  return fixer.replaceText(node, `tryCatch(() => ${callText})`);
                },
              },
            ],
          });
        }
      },
    };
  },
});
