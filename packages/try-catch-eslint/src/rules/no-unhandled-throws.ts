import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/shkumbinhasani/ts-try-catch/blob/main/docs/rules/${name}.md`
);

interface TryCatchBinding {
  dataName: string;
  errorName: string;
  scope: TSESTree.Node;
}

/**
 * Checks if a node is inside an error-checked block
 * e.g., inside the else branch of `if (error) { ... } else { ... }`
 * or after an early return like `if (error) return;`
 */
function isInsideErrorCheckedBlock(
  node: TSESTree.Node,
  errorName: string
): boolean {
  let current: TSESTree.Node | undefined = node.parent;

  while (current) {
    // Check if we're in the 'else' or 'consequent with negation' of an if statement
    if (current.type === "IfStatement") {
      const ifStatement = current;
      const test = ifStatement.test;

      // Check for `if (error)` - we'd be safe in the else branch
      if (test.type === "Identifier" && test.name === errorName) {
        // Check if node is in the else branch (safe) or consequent (error path)
        if (
          ifStatement.alternate &&
          isNodeInside(node, ifStatement.alternate)
        ) {
          return true;
        }
      }

      // Check for `if (!error)` - we'd be safe in the consequent
      if (
        test.type === "UnaryExpression" &&
        test.operator === "!" &&
        test.argument.type === "Identifier" &&
        test.argument.name === errorName
      ) {
        if (isNodeInside(node, ifStatement.consequent)) {
          return true;
        }
      }

      // Check for `if (error !== null)` or `if (error != null)`
      if (
        test.type === "BinaryExpression" &&
        (test.operator === "!==" || test.operator === "!=") &&
        test.left.type === "Identifier" &&
        test.left.name === errorName
      ) {
        if (
          ifStatement.alternate &&
          isNodeInside(node, ifStatement.alternate)
        ) {
          return true;
        }
      }

      // Check for `if (error === null)` or `if (error == null)`
      if (
        test.type === "BinaryExpression" &&
        (test.operator === "===" || test.operator === "==") &&
        test.left.type === "Identifier" &&
        test.left.name === errorName
      ) {
        if (isNodeInside(node, ifStatement.consequent)) {
          return true;
        }
      }
    }

    current = current.parent;
  }

  return false;
}

/**
 * Checks if a node is contained within another node
 */
function isNodeInside(node: TSESTree.Node, container: TSESTree.Node): boolean {
  let current: TSESTree.Node | undefined = node;
  while (current) {
    if (current === container) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/**
 * Checks if there's an early return/throw after error check before this node
 */
function hasEarlyReturnAfterErrorCheck(
  node: TSESTree.Node,
  errorName: string
): boolean {
  // Find the containing block or program
  let blockParent: TSESTree.Node | undefined = node.parent;
  while (
    blockParent &&
    blockParent.type !== "BlockStatement" &&
    blockParent.type !== "Program"
  ) {
    blockParent = blockParent.parent;
  }

  if (!blockParent) {
    return false;
  }

  const body =
    blockParent.type === "BlockStatement"
      ? (blockParent as TSESTree.BlockStatement).body
      : blockParent.type === "Program"
        ? (blockParent as TSESTree.Program).body
        : null;

  if (!body) {
    return false;
  }

  const nodeIndex = findStatementIndexInBody(body, node);

  // Look for `if (error) return/throw` before this node
  for (let i = 0; i < nodeIndex; i++) {
    const stmt = body[i];
    if (stmt.type === "IfStatement") {
      const test = stmt.test;
      const isErrorCheck =
        (test.type === "Identifier" && test.name === errorName) ||
        (test.type === "BinaryExpression" &&
          (test.operator === "!==" || test.operator === "!=") &&
          test.left.type === "Identifier" &&
          test.left.name === errorName);

      if (isErrorCheck) {
        const consequent = stmt.consequent;
        // Check if consequent contains return or throw
        if (
          consequent.type === "ReturnStatement" ||
          consequent.type === "ThrowStatement"
        ) {
          return true;
        }
        if (consequent.type === "BlockStatement") {
          const hasExit = consequent.body.some(
            (s) => s.type === "ReturnStatement" || s.type === "ThrowStatement"
          );
          if (hasExit) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Find the index of a statement containing the node in a body array
 */
function findStatementIndexInBody(
  body: TSESTree.Statement[] | TSESTree.ProgramStatement[],
  node: TSESTree.Node
): number {
  for (let i = 0; i < body.length; i++) {
    if (isNodeInside(node, body[i])) {
      return i;
    }
  }
  return body.length;
}

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
        "Variable '{{name}}' from tryCatch() is used without checking '{{errorName}}' first",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const tryCatchBindings: TryCatchBinding[] = [];

    return {
      // Detect const [data, error] = tryCatch(...) or await tryCatch(...)
      VariableDeclarator(node) {
        // Check for array destructuring pattern
        if (node.id.type !== "ArrayPattern") {
          return;
        }

        // Check if init is tryCatch() or await tryCatch()
        let callExpr: TSESTree.CallExpression | null = null;

        if (node.init?.type === "CallExpression") {
          callExpr = node.init;
        } else if (
          node.init?.type === "AwaitExpression" &&
          node.init.argument.type === "CallExpression"
        ) {
          callExpr = node.init.argument;
        }

        if (!callExpr) {
          return;
        }

        // Check if it's a tryCatch call
        if (
          callExpr.callee.type !== "Identifier" ||
          callExpr.callee.name !== "tryCatch"
        ) {
          return;
        }

        // Get the destructured names
        const elements = node.id.elements;
        if (elements.length < 2) {
          return;
        }

        const dataElement = elements[0];
        const errorElement = elements[1];

        if (
          !dataElement ||
          !errorElement ||
          dataElement.type !== "Identifier" ||
          errorElement.type !== "Identifier"
        ) {
          return;
        }

        // Find the scope (containing function or program)
        let scope: TSESTree.Node = node;
        while (
          scope.parent &&
          scope.parent.type !== "FunctionDeclaration" &&
          scope.parent.type !== "FunctionExpression" &&
          scope.parent.type !== "ArrowFunctionExpression" &&
          scope.parent.type !== "Program"
        ) {
          scope = scope.parent;
        }

        tryCatchBindings.push({
          dataName: dataElement.name,
          errorName: errorElement.name,
          scope: scope.parent || scope,
        });
      },

      // Check usage of data variables
      Identifier(node) {
        // Skip if this is a declaration, not a usage
        if (
          node.parent?.type === "VariableDeclarator" &&
          (node.parent as TSESTree.VariableDeclarator).id === node
        ) {
          return;
        }

        // Skip if this is a property key
        if (
          node.parent?.type === "Property" &&
          (node.parent as TSESTree.Property).key === node
        ) {
          return;
        }

        // Skip if this is an assignment target in array pattern
        if (node.parent?.type === "ArrayPattern") {
          return;
        }

        // Check if this identifier is a data variable from tryCatch
        const binding = tryCatchBindings.find(
          (b) => b.dataName === node.name && isNodeInside(node, b.scope)
        );

        if (!binding) {
          return;
        }

        // Check if we're inside an error-checked block
        if (isInsideErrorCheckedBlock(node, binding.errorName)) {
          return;
        }

        // Check if there's an early return after error check
        if (hasEarlyReturnAfterErrorCheck(node, binding.errorName)) {
          return;
        }

        context.report({
          node,
          messageId: "noUnhandledThrows",
          data: {
            name: binding.dataName,
            errorName: binding.errorName,
          },
        });
      },
    };
  },
});
