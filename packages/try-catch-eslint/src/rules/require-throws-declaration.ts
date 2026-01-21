import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import * as ts from "typescript";

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/shkumbinhasani/ts-try-catch/blob/main/docs/rules/${name}.md`
);

/**
 * Extracts the error type names from a Throws<E> type
 * Returns an array of error type names declared in Throws<>
 */
function extractThrowsErrorNames(type: ts.Type, checker: ts.TypeChecker): string[] {
  const errorNames: string[] = [];
  const typeString = checker.typeToString(type);

  // Check intersection types
  if (type.isIntersection()) {
    for (const t of type.types) {
      errorNames.push(...extractThrowsErrorNames(t, checker));
    }
    return errorNames;
  }

  // Check union types
  if (type.isUnion()) {
    for (const t of type.types) {
      errorNames.push(...extractThrowsErrorNames(t, checker));
    }
    return errorNames;
  }

  // Check Promise types - unwrap and check inner type
  const symbol = type.getSymbol();
  if (symbol?.getName() === "Promise") {
    const typeArgs = (type as ts.TypeReference).typeArguments;
    if (typeArgs && typeArgs.length > 0) {
      return extractThrowsErrorNames(typeArgs[0], checker);
    }
  }

  // Check if this is a Throws type by looking at properties
  // Throws<E> has a phantom property like [errorSymbol]?: E
  const properties = type.getProperties();
  for (const prop of properties) {
    const propName = prop.getName();
    // The error symbol property contains the error type
    if (propName.startsWith("__@") || propName.includes("error")) {
      const propType = checker.getTypeOfSymbol(prop);
      // Get the error type name(s)
      if (propType.isUnion()) {
        for (const unionType of propType.types) {
          const name = unionType.getSymbol()?.getName();
          if (name && name !== "undefined") {
            errorNames.push(name);
          }
        }
      } else {
        const name = propType.getSymbol()?.getName();
        if (name && name !== "undefined") {
          errorNames.push(name);
        }
      }
    }
  }

  // Also try to extract from the type string as a fallback
  // Match Throws<ErrorType> or Throws<ErrorA | ErrorB>
  const throwsMatch = typeString.match(/Throws<([^>]+)>/);
  if (throwsMatch) {
    const errorTypesStr = throwsMatch[1];
    // Split by | for union types
    const types = errorTypesStr.split("|").map(t => t.trim());
    errorNames.push(...types);
  }

  return [...new Set(errorNames)]; // Remove duplicates
}

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

  // Check Promise types - unwrap and check inner type
  const symbol = type.getSymbol();
  if (symbol?.getName() === "Promise") {
    const typeArgs = (type as ts.TypeReference).typeArguments;
    if (typeArgs && typeArgs.length > 0) {
      return hasThrowsType(typeArgs[0], checker);
    }
  }

  return false;
}

/**
 * Checks if the thrown error name is included in the declared Throws<> type
 */
function isErrorDeclaredInThrows(
  thrownErrorName: string,
  declaredErrors: string[]
): boolean {
  // Check for exact match
  if (declaredErrors.includes(thrownErrorName)) {
    return true;
  }
  
  // Check if "Error" is declared (catches all errors)
  if (declaredErrors.includes("Error")) {
    return true;
  }

  return false;
}

/**
 * Gets the name of a thrown error class if it's a `new Error()` or `new CustomError()` expression
 */
function getThrownErrorName(node: TSESTree.ThrowStatement): string | null {
  if (
    node.argument?.type === "NewExpression" &&
    node.argument.callee.type === "Identifier"
  ) {
    return node.argument.callee.name;
  }
  // Handle throwing existing error: throw error
  if (node.argument?.type === "Identifier") {
    return node.argument.name;
  }
  return null;
}

/**
 * Gets the containing function of a node
 */
function getContainingFunction(
  node: TSESTree.Node
): TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression | null {
  let current: TSESTree.Node | undefined = node.parent;

  while (current) {
    if (
      current.type === "FunctionDeclaration" ||
      current.type === "FunctionExpression" ||
      current.type === "ArrowFunctionExpression"
    ) {
      return current;
    }
    current = current.parent;
  }

  return null;
}

/**
 * Gets the function name for error reporting
 */
function getFunctionName(
  node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression
): string {
  if (node.type === "FunctionDeclaration" && node.id) {
    return node.id.name;
  }
  if (node.type === "FunctionExpression" && node.id) {
    return node.id.name;
  }
  // Check if it's assigned to a variable
  if (node.parent?.type === "VariableDeclarator" && node.parent.id.type === "Identifier") {
    return node.parent.id.name;
  }
  // Check if it's a method
  if (node.parent?.type === "MethodDefinition" && node.parent.key.type === "Identifier") {
    return node.parent.key.name;
  }
  // Check if it's a property
  if (node.parent?.type === "Property" && node.parent.key.type === "Identifier") {
    return node.parent.key.name;
  }
  return "anonymous function";
}

/**
 * Check if throw is inside a try block (caught locally)
 */
function isInsideTryBlock(node: TSESTree.Node): boolean {
  let current: TSESTree.Node | undefined = node.parent;

  while (current) {
    // If we hit a function boundary, stop searching
    if (
      current.type === "FunctionDeclaration" ||
      current.type === "FunctionExpression" ||
      current.type === "ArrowFunctionExpression"
    ) {
      return false;
    }

    // Check if we're directly inside a try block
    if (current.type === "TryStatement") {
      // Check if the throw is in the try block (not catch or finally)
      const tryStatement = current;
      let throwParent: TSESTree.Node | undefined = node.parent;
      
      while (throwParent && throwParent !== tryStatement) {
        if (throwParent === tryStatement.block) {
          return true; // It's in the try block, so it's caught
        }
        throwParent = throwParent.parent;
      }
    }

    current = current.parent;
  }

  return false;
}

/**
 * Finds the last return statement in a function (not in nested functions)
 */
function findLastReturnStatement(
  node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression
): TSESTree.ReturnStatement | null {
  let lastReturn: TSESTree.ReturnStatement | null = null;

  function visit(current: TSESTree.Node) {
    // Don't traverse into nested functions
    if (
      current !== node &&
      (current.type === "FunctionDeclaration" ||
        current.type === "FunctionExpression" ||
        current.type === "ArrowFunctionExpression")
    ) {
      return;
    }

    if (current.type === "ReturnStatement") {
      lastReturn = current;
    }

    // Visit children - use body for functions, members for objects
    if ("body" in current && current.body) {
      if (Array.isArray(current.body)) {
        for (const stmt of current.body) {
          visit(stmt);
        }
      } else if (typeof current.body === "object" && "type" in current.body) {
        visit(current.body);
      }
    }

    // Handle block statements
    if (current.type === "BlockStatement" && current.body) {
      for (const stmt of current.body) {
        visit(stmt);
      }
    }

    // Handle if statements
    if (current.type === "IfStatement") {
      visit(current.consequent);
      if (current.alternate) {
        visit(current.alternate);
      }
    }

    // Handle try statements
    if (current.type === "TryStatement") {
      visit(current.block);
      if (current.handler) {
        visit(current.handler.body);
      }
      if (current.finalizer) {
        visit(current.finalizer);
      }
    }
  }

  visit(node);
  return lastReturn;
}

/**
 * Gets the expression from an arrow function body (for implicit returns)
 */
function getArrowFunctionImplicitReturn(
  node: TSESTree.ArrowFunctionExpression
): TSESTree.Expression | null {
  if (node.body.type !== "BlockStatement") {
    return node.body;
  }
  return null;
}

/**
 * Check if a return value is already wrapped with tc().mightThrow()
 */
function isAlreadyWrappedWithTc(node: TSESTree.Expression | null): boolean {
  if (!node) return false;
  
  // Check for tc(value).mightThrow<E>() pattern
  if (
    node.type === "CallExpression" &&
    node.callee.type === "MemberExpression" &&
    node.callee.property.type === "Identifier" &&
    node.callee.property.name === "mightThrow"
  ) {
    // Check if the object is tc(...)
    const obj = node.callee.object;
    if (
      obj.type === "CallExpression" &&
      obj.callee.type === "Identifier" &&
      obj.callee.name === "tc"
    ) {
      return true;
    }
  }
  return false;
}

type MessageIds = 
  | "missingThrowsDeclaration"
  | "missingThrowsDeclarationUnknown"
  | "errorNotInThrowsDeclaration"
  | "suggestWrapReturnWithTc"
  | "suggestAddThrowsToReturnType"
  | "suggestAddErrorToThrows";

export const requireThrowsDeclaration = createRule<[], MessageIds>({
  name: "require-throws-declaration",
  meta: {
    type: "problem",
    docs: {
      description:
        "Require functions with throw statements to declare Throws<> in their return type",
    },
    hasSuggestions: true,
    messages: {
      missingThrowsDeclaration:
        "Function '{{name}}' throws '{{errorName}}' but doesn't declare it in return type. Use tc(value).mightThrow<{{errorName}}>() or add Throws<{{errorName}}> to the return type.",
      missingThrowsDeclarationUnknown:
        "Function '{{name}}' has a throw statement but doesn't declare Throws<> in its return type. Use tc(value).mightThrow<ErrorType>() to declare thrown errors.",
      errorNotInThrowsDeclaration:
        "Function '{{name}}' throws '{{errorName}}' but only declares Throws<{{declaredErrors}}>. Add '{{errorName}}' to the Throws<> type.",
      suggestWrapReturnWithTc:
        "Wrap return value with tc().mightThrow<{{errorName}}>()",
      suggestAddThrowsToReturnType:
        "Add Throws<{{errorName}}> to function return type",
      suggestAddErrorToThrows:
        "Add '{{errorName}}' to existing Throws<> declaration",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils.getParserServices(context);
    const checker = services.program.getTypeChecker();
    const sourceCode = context.sourceCode;

    return {
      ThrowStatement(node) {
        // Skip if throw is inside a try block (error is caught locally)
        if (isInsideTryBlock(node)) {
          return;
        }

        const containingFunction = getContainingFunction(node);
        if (!containingFunction) {
          return; // Throw at module level, not our concern
        }

        // Get the TypeScript node for the function
        const tsNode = services.esTreeNodeToTSNodeMap.get(containingFunction);
        const signature = checker.getSignatureFromDeclaration(
          tsNode as ts.SignatureDeclaration
        );

        if (!signature) {
          return;
        }

        const returnType = checker.getReturnTypeOfSignature(signature);
        const functionName = getFunctionName(containingFunction);
        const thrownErrorName = getThrownErrorName(node);

        // Check if return type includes Throws<>
        if (hasThrowsType(returnType, checker)) {
          // Has Throws<>, but we need to check if the thrown error is declared
          if (thrownErrorName) {
            const declaredErrors = extractThrowsErrorNames(returnType, checker);
            
            if (!isErrorDeclaredInThrows(thrownErrorName, declaredErrors)) {
              // Find the mightThrow call to update
              const lastReturn = findLastReturnStatement(containingFunction);
              const implicitReturn = containingFunction.type === "ArrowFunctionExpression"
                ? getArrowFunctionImplicitReturn(containingFunction)
                : null;
              
              const targetExpr = lastReturn?.argument || implicitReturn;
              
              context.report({
                node,
                messageId: "errorNotInThrowsDeclaration",
                data: {
                  name: functionName,
                  errorName: thrownErrorName,
                  declaredErrors: declaredErrors.join(" | ") || "unknown",
                },
                suggest: targetExpr && 
                  targetExpr.type === "CallExpression" &&
                  targetExpr.typeArguments
                  ? [{
                      messageId: "suggestAddErrorToThrows" as const,
                      data: { errorName: thrownErrorName },
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      fix(fixer: any) {
                        const newErrors = [...declaredErrors, thrownErrorName].join(" | ");
                        return fixer.replaceTextRange(
                          [targetExpr.typeArguments!.range[0], targetExpr.typeArguments!.range[1]],
                          `<${newErrors}>`
                        );
                      },
                    }]
                  : undefined,
              });
            }
          }
          return;
        }

        // No Throws<> at all - provide suggestions
        if (thrownErrorName) {
          // Find the return statement or implicit return to wrap
          const lastReturn = findLastReturnStatement(containingFunction);
          const implicitReturn = containingFunction.type === "ArrowFunctionExpression"
            ? getArrowFunctionImplicitReturn(containingFunction)
            : null;
          
          const targetExpr = lastReturn?.argument || implicitReturn;
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const suggestions: any[] = [];

          // Suggestion 1: Wrap return value with tc().mightThrow<E>()
          if (targetExpr && !isAlreadyWrappedWithTc(targetExpr)) {
            const argText = sourceCode.getText(targetExpr);
            suggestions.push({
              messageId: "suggestWrapReturnWithTc",
              data: { errorName: thrownErrorName },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              fix(fixer: any) {
                return fixer.replaceTextRange(
                  [targetExpr.range[0], targetExpr.range[1]],
                  `tc(${argText}).mightThrow<${thrownErrorName}>()`
                );
              },
            });
          }

          // Suggestion 2: Add return type annotation
          if (containingFunction.returnType) {
            // Has return type - modify it
            const returnTypeNode = containingFunction.returnType.typeAnnotation;
            const currentTypeText = sourceCode.getText(returnTypeNode);
            
            if (currentTypeText.startsWith("Promise<")) {
              const innerMatch = currentTypeText.match(/^Promise<(.+)>$/);
              if (innerMatch) {
                const innerType = innerMatch[1];
                suggestions.push({
                  messageId: "suggestAddThrowsToReturnType",
                  data: { errorName: thrownErrorName },
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  fix(fixer: any) {
                    return fixer.replaceText(
                      returnTypeNode,
                      `Promise<${innerType} & Throws<${thrownErrorName}>>`
                    );
                  },
                });
              }
            } else {
              suggestions.push({
                messageId: "suggestAddThrowsToReturnType",
                data: { errorName: thrownErrorName },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                fix(fixer: any) {
                  return fixer.replaceText(
                    returnTypeNode,
                    `${currentTypeText} & Throws<${thrownErrorName}>`
                  );
                },
              });
            }
          } else {
            // No return type - add one
            const closeParenToken = sourceCode.getTokenBefore(
              containingFunction.body,
              (token) => token.value === ")"
            );
            
            if (closeParenToken) {
              suggestions.push({
                messageId: "suggestAddThrowsToReturnType",
                data: { errorName: thrownErrorName },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                fix(fixer: any) {
                  return fixer.insertTextAfter(
                    closeParenToken,
                    `: Throws<${thrownErrorName}>`
                  );
                },
              });
            }
          }

          context.report({
            node,
            messageId: "missingThrowsDeclaration",
            data: {
              name: functionName,
              errorName: thrownErrorName,
            },
            suggest: suggestions.length > 0 ? suggestions : undefined,
          });
        } else {
          context.report({
            node,
            messageId: "missingThrowsDeclarationUnknown",
            data: {
              name: functionName,
            },
            // Can't provide suggestions without knowing the error type
          });
        }
      },
    };
  },
});
