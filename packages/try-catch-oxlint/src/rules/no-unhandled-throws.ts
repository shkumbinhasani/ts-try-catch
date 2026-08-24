import { defineRule } from "@oxlint/plugins";
import {
  isFunctionLike,
  isNodeInside,
  toAstNode,
  unwrapExpression,
  type AstNode,
} from "../utils.js";

interface TryCatchBinding {
  dataName: string;
  errorName: string;
  scope: AstNode;
}

/** True when the test of an `if` asserts that `errorName` holds an error. */
function isTruthyErrorTest(test: AstNode, errorName: string): boolean {
  const expression = unwrapExpression(test);
  if (!expression) return false;

  if (expression.type === "Identifier" && expression.name === errorName) return true;

  return (
    expression.type === "BinaryExpression" &&
    (expression.operator === "!==" || expression.operator === "!=") &&
    isIdentifier(expression.left as AstNode, errorName)
  );
}

/** True when the test of an `if` asserts that `errorName` is empty. */
function isFalsyErrorTest(test: AstNode, errorName: string): boolean {
  const expression = unwrapExpression(test);
  if (!expression) return false;

  if (
    expression.type === "UnaryExpression" &&
    expression.operator === "!" &&
    isIdentifier(unwrapExpression(expression.argument as AstNode), errorName)
  ) {
    return true;
  }

  return (
    expression.type === "BinaryExpression" &&
    (expression.operator === "===" || expression.operator === "==") &&
    isIdentifier(expression.left as AstNode, errorName)
  );
}

function isIdentifier(node: AstNode | null, name: string): boolean {
  const expression = unwrapExpression(node);
  return expression?.type === "Identifier" && expression.name === name;
}

/**
 * True when the node sits on a branch where the error has been ruled out —
 * the `else` of `if (error)`, or the body of `if (!error)`.
 */
function isInsideErrorCheckedBlock(node: AstNode, errorName: string): boolean {
  let current = node.parent ?? null;

  while (current) {
    if (current.type === "IfStatement") {
      const test = current.test as AstNode;
      const consequent = current.consequent as AstNode;
      const alternate = (current.alternate as AstNode | null) ?? null;

      if (isTruthyErrorTest(test, errorName) && alternate && isNodeInside(node, alternate)) {
        return true;
      }
      if (isFalsyErrorTest(test, errorName) && isNodeInside(node, consequent)) {
        return true;
      }
    }

    current = current.parent ?? null;
  }

  return false;
}

/** True when the statement leaves the current function or loop iteration. */
function isExitStatement(node: AstNode): boolean {
  return (
    node.type === "ReturnStatement" ||
    node.type === "ThrowStatement" ||
    node.type === "ContinueStatement" ||
    node.type === "BreakStatement"
  );
}

/** True when an earlier `if (error) return;`-style guard protects this node. */
function hasEarlyReturnAfterErrorCheck(node: AstNode, errorName: string): boolean {
  let block = node.parent ?? null;
  while (block && block.type !== "BlockStatement" && block.type !== "Program") {
    block = block.parent ?? null;
  }
  if (!block) return false;

  const body = (block.body as AstNode[] | undefined) ?? [];
  const nodeIndex = body.findIndex((statement) => isNodeInside(node, statement));
  const upperBound = nodeIndex === -1 ? body.length : nodeIndex;

  for (let i = 0; i < upperBound; i++) {
    const statement = body[i]!;
    if (statement.type !== "IfStatement") continue;
    if (!isTruthyErrorTest(statement.test as AstNode, errorName)) continue;

    const consequent = statement.consequent as AstNode;
    if (isExitStatement(consequent)) return true;
    if (
      consequent.type === "BlockStatement" &&
      ((consequent.body as AstNode[]) ?? []).some(isExitStatement)
    ) {
      return true;
    }
  }

  return false;
}

/** True when the identifier is a binding or a name rather than a value read. */
function isNonValueUsage(node: AstNode): boolean {
  const parent = node.parent ?? null;
  if (!parent) return false;

  // `const [data, error] = ...` — the declaration itself.
  if (parent.type === "VariableDeclarator" && parent.id === node) return true;
  if (parent.type === "ArrayPattern" || parent.type === "ObjectPattern") return true;
  // `{ data: 1 }` — a property name, not the tryCatch variable.
  if (parent.type === "Property" && parent.key === node && parent.computed !== true) {
    return true;
  }
  // `other.data` — a member name, not the tryCatch variable.
  if (
    parent.type === "MemberExpression" &&
    parent.property === node &&
    parent.computed !== true
  ) {
    return true;
  }

  return false;
}

/**
 * Requires the error half of a `tryCatch()` tuple to be checked before the data
 * half is read. This rule is purely syntactic, so it behaves the same as the
 * ESLint version in `@shkumbinhsn/try-catch-eslint`.
 */
export const noUnhandledThrows = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Ensure error is checked before accessing data from tryCatch()",
      url: "https://github.com/shkumbinhasani/ts-try-catch/tree/main/packages/try-catch-oxlint#no-unhandled-throws",
    },
    messages: {
      noUnhandledThrows:
        "Variable '{{name}}' from tryCatch() is used without checking '{{errorName}}' first",
    },
    schema: [],
  },
  createOnce(context) {
    let bindings: TryCatchBinding[] = [];

    return {
      before() {
        bindings = [];
      },

      // `const [data, error] = tryCatch(...)` / `await tryCatch(...)`
      VariableDeclarator(node) {
        const declarator = toAstNode(node);
        const id = declarator.id as AstNode;
        if (id.type !== "ArrayPattern") return;

        let init = unwrapExpression(declarator.init as AstNode | null);
        if (init?.type === "AwaitExpression") {
          init = unwrapExpression(init.argument as AstNode);
        }
        if (init?.type !== "CallExpression") return;

        const callee = unwrapExpression(init.callee as AstNode);
        if (callee?.type !== "Identifier" || callee.name !== "tryCatch") return;

        const elements = (id.elements as (AstNode | null)[]) ?? [];
        const dataElement = elements[0] ?? null;
        const errorElement = elements[1] ?? null;
        if (dataElement?.type !== "Identifier" || errorElement?.type !== "Identifier") {
          return;
        }

        // Walk out to the enclosing function or program: the binding's scope.
        let scope: AstNode = declarator;
        while (scope.parent && !isFunctionLike(scope.parent) && scope.parent.type !== "Program") {
          scope = scope.parent;
        }

        bindings.push({
          dataName: dataElement.name as string,
          errorName: errorElement.name as string,
          scope: scope.parent ?? scope,
        });
      },

      Identifier(node) {
        const identifier = toAstNode(node);
        if (isNonValueUsage(identifier)) return;

        const binding = bindings.find(
          (candidate) =>
            candidate.dataName === identifier.name && isNodeInside(identifier, candidate.scope)
        );
        if (!binding) return;

        if (isInsideErrorCheckedBlock(identifier, binding.errorName)) return;
        if (hasEarlyReturnAfterErrorCheck(identifier, binding.errorName)) return;

        context.report({
          node,
          messageId: "noUnhandledThrows",
          data: { name: binding.dataName, errorName: binding.errorName },
        });
      },
    };
  },
});
