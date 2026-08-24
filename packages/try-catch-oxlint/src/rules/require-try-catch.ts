import { defineRule } from "@oxlint/plugins";
import type { Fix, Fixer } from "@oxlint/plugins";
import {
  getDeclaredThrows,
  isFunctionLike,
  isInsideTryCatch,
  toAstNode,
  unwrapExpression,
  type AstNode,
} from "../utils.js";

/**
 * Requires calls to `Throws<>`-declaring functions to be wrapped in `tryCatch()`.
 *
 * Oxlint JS plugins get no type information, so the declaring functions are found
 * syntactically: only functions declared in the same file are known to throw.
 * The type-aware version of this rule lives in `@shkumbinhsn/try-catch-eslint`.
 */
export const requireTryCatch = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require calls to functions declaring Throws<> to be wrapped in tryCatch()",
      url: "https://github.com/shkumbinhasani/ts-try-catch/tree/main/packages/try-catch-oxlint#require-try-catch",
    },
    hasSuggestions: true,
    messages: {
      requireTryCatch:
        "Function '{{name}}' has a Throws<> return type and should be wrapped in tryCatch()",
      suggestWrapInTryCatch: "Wrap in tryCatch(() => {{name}}())",
    },
    schema: [],
  },
  createOnce(context) {
    /** Names of functions declared in this file that declare thrown errors. */
    let throwingFunctions = new Set<string>();
    /** Unwrapped calls to collect now and report once the whole file is known. */
    let candidateCalls: { node: AstNode; name: string }[] = [];

    /** Records the name of a function that declares thrown errors. */
    const collectDeclaration = (node: unknown) => {
      const fn = toAstNode(node as never);
      if (!isFunctionLike(fn)) return;
      if (getDeclaredThrows(fn, context).kind === null) return;

      const id = fn.id as AstNode | null | undefined;
      if (id?.type === "Identifier") {
        throwingFunctions.add(id.name as string);
        return;
      }

      // `const fetchUser = (): Throws<E> => ...`
      const parent = fn.parent ?? null;
      if (parent?.type === "VariableDeclarator") {
        const declaratorId = parent.id as AstNode;
        if (declaratorId.type === "Identifier") {
          throwingFunctions.add(declaratorId.name as string);
        }
      }
    };

    return {
      before() {
        throwingFunctions = new Set();
        candidateCalls = [];
      },

      FunctionDeclaration: collectDeclaration,
      FunctionExpression: collectDeclaration,
      ArrowFunctionExpression: collectDeclaration,

      CallExpression(node) {
        const call = toAstNode(node);
        const callee = unwrapExpression(call.callee as AstNode);
        if (callee?.type !== "Identifier") return;

        const name = callee.name as string;
        // `tryCatch()` catches, `tc()`/`mightThrow()` only declare.
        if (name === "tryCatch" || name === "tc") return;
        if (isInsideTryCatch(call)) return;

        candidateCalls.push({ node: call, name });
      },

      "Program:exit"() {
        for (const { node, name } of candidateCalls) {
          if (!throwingFunctions.has(name)) continue;

          const callText = context.sourceCode.getText(node);
          context.report({
            node,
            messageId: "requireTryCatch",
            data: { name },
            suggest: [
              {
                messageId: "suggestWrapInTryCatch",
                data: { name },
                fix: (fixer: Fixer): Fix =>
                  fixer.replaceText(node, `tryCatch(() => ${callText})`),
              },
            ],
          });
        }
      },
    };
  },
});
