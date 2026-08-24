import type { Context, ESTree } from "@oxlint/plugins";

/**
 * Loose view of an AST node.
 *
 * Oxlint's ESTree types are precise unions, which makes generic parent walking
 * and child traversal awkward. These helpers walk the tree structurally, so they
 * work against this shape and callers narrow with `type` checks.
 */
export interface AstNode {
  type: string;
  parent?: AstNode | null;
  range: [number, number];
  [key: string]: unknown;
}

export type FunctionLikeNode = AstNode & {
  type: "FunctionDeclaration" | "FunctionExpression" | "ArrowFunctionExpression";
};

const FUNCTION_TYPES = new Set([
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
]);

export function isFunctionLike(node: AstNode | null | undefined): node is FunctionLikeNode {
  return !!node && FUNCTION_TYPES.has(node.type);
}

/** Unwraps `(expr)`, `expr!` and `expr as T` down to the underlying expression. */
export function unwrapExpression(node: AstNode | null | undefined): AstNode | null {
  let current = node ?? null;
  while (
    current &&
    (current.type === "ParenthesizedExpression" ||
      current.type === "TSNonNullExpression" ||
      current.type === "TSAsExpression" ||
      current.type === "TSSatisfiesExpression")
  ) {
    current = (current.expression as AstNode | undefined) ?? null;
  }
  return current;
}

/** Unwraps `(T)` down to the underlying type node. */
function unwrapType(node: AstNode | null | undefined): AstNode | null {
  let current = node ?? null;
  while (current && current.type === "TSParenthesizedType") {
    current = (current.typeAnnotation as AstNode | undefined) ?? null;
  }
  return current;
}

/** Name of a type reference: `Foo` -> "Foo", `NS.Foo` -> "Foo". */
function typeReferenceName(typeName: AstNode | null | undefined): string | null {
  if (!typeName) return null;
  if (typeName.type === "Identifier") return typeName.name as string;
  if (typeName.type === "TSQualifiedName") {
    return typeReferenceName(typeName.right as AstNode);
  }
  return null;
}

/** The nearest enclosing function, or `null` when the node is at module level. */
export function getContainingFunction(node: AstNode): FunctionLikeNode | null {
  let current = node.parent ?? null;
  while (current) {
    if (isFunctionLike(current)) return current;
    current = current.parent ?? null;
  }
  return null;
}

/** True when `node` is `container` or nested inside it. */
export function isNodeInside(node: AstNode, container: AstNode): boolean {
  let current: AstNode | null = node;
  while (current) {
    if (current === container) return true;
    current = current.parent ?? null;
  }
  return false;
}

/**
 * True when the node sits in the `try` block of a `try`/`catch`, so the error
 * never escapes the enclosing function. A `try`/`finally` without a `catch`
 * does not catch anything, so it does not count.
 */
export function isCaughtLocally(node: AstNode): boolean {
  let child: AstNode = node;
  let current = node.parent ?? null;

  while (current) {
    if (isFunctionLike(current)) return false;
    if (current.type === "TryStatement" && current.handler && child === current.block) {
      return true;
    }
    child = current;
    current = current.parent ?? null;
  }

  return false;
}

/** Name of the thrown error: `throw new Foo()` -> "Foo", `throw err` -> "err". */
export function getThrownErrorName(node: AstNode): string | null {
  const argument = unwrapExpression(node.argument as AstNode | undefined);
  if (!argument) return null;

  if (argument.type === "NewExpression") {
    const callee = unwrapExpression(argument.callee as AstNode);
    if (callee?.type === "Identifier") return callee.name as string;
    return null;
  }
  if (argument.type === "Identifier") return argument.name as string;

  return null;
}

/** Human-readable name of a function, for diagnostic messages. */
export function getFunctionName(node: FunctionLikeNode): string {
  const id = node.id as AstNode | null | undefined;
  if (id?.type === "Identifier") return id.name as string;

  const parent = node.parent ?? null;
  if (parent?.type === "VariableDeclarator") {
    const declaratorId = parent.id as AstNode;
    if (declaratorId.type === "Identifier") return declaratorId.name as string;
  }
  if (parent?.type === "MethodDefinition" || parent?.type === "Property") {
    const key = parent.key as AstNode;
    if (key.type === "Identifier") return key.name as string;
    if (key.type === "Literal" || key.type === "StringLiteral") {
      return String(key.value);
    }
  }
  if (parent?.type === "PropertyDefinition") {
    const key = parent.key as AstNode;
    if (key.type === "Identifier") return key.name as string;
  }

  return "anonymous function";
}

const SKIPPED_KEYS = new Set(["parent", "loc", "range", "type", "start", "end"]);

/**
 * Visits every descendant of `node`, without entering nested functions.
 * Used instead of hand-rolled per-statement recursion so new syntax is covered.
 */
function walkWithinFunction(node: AstNode, visit: (child: AstNode) => void): void {
  for (const key of Object.keys(node)) {
    if (SKIPPED_KEYS.has(key)) continue;
    const value = (node as Record<string, unknown>)[key];
    const children = Array.isArray(value) ? value : [value];

    for (const child of children) {
      if (!child || typeof child !== "object") continue;
      const childNode = child as AstNode;
      if (typeof childNode.type !== "string") continue;

      visit(childNode);
      if (!isFunctionLike(childNode)) {
        walkWithinFunction(childNode, visit);
      }
    }
  }
}

/** The last `return` statement of a function, ignoring nested functions. */
export function findLastReturnStatement(node: FunctionLikeNode): AstNode | null {
  let lastReturn: AstNode | null = null;
  walkWithinFunction(node, (child) => {
    if (child.type === "ReturnStatement") lastReturn = child;
  });
  return lastReturn;
}

/** The implicitly returned expression of a concise-body arrow function. */
export function getImplicitReturn(node: FunctionLikeNode): AstNode | null {
  if (node.type !== "ArrowFunctionExpression") return null;
  const body = node.body as AstNode;
  return body.type === "BlockStatement" ? null : body;
}

/** The expression a function hands back, whether returned explicitly or implicitly. */
export function getReturnedExpression(node: FunctionLikeNode): AstNode | null {
  const lastReturn = findLastReturnStatement(node);
  if (lastReturn?.argument) return lastReturn.argument as AstNode;
  return getImplicitReturn(node);
}

/** Matches `tc(value).mightThrow<E>()`, returning its type arguments node. */
export function getMightThrowCall(
  node: AstNode | null | undefined
): { call: AstNode; typeArguments: AstNode | null } | null {
  const expression = unwrapExpression(node);
  if (expression?.type !== "CallExpression") return null;

  const callee = unwrapExpression(expression.callee as AstNode);
  if (
    callee?.type !== "MemberExpression" ||
    callee.computed === true ||
    (callee.property as AstNode).type !== "Identifier" ||
    (callee.property as AstNode).name !== "mightThrow"
  ) {
    return null;
  }

  const object = unwrapExpression(callee.object as AstNode);
  if (object?.type !== "CallExpression") return null;
  const objectCallee = unwrapExpression(object.callee as AstNode);
  if (objectCallee?.type !== "Identifier" || objectCallee.name !== "tc") return null;

  return {
    call: expression,
    typeArguments: (expression.typeArguments as AstNode | null | undefined) ?? null,
  };
}

/** Flattens the members of a union type into a list of type nodes. */
function flattenUnion(node: AstNode | null): AstNode[] {
  const type = unwrapType(node);
  if (!type) return [];
  if (type.type === "TSUnionType") {
    return (type.types as AstNode[]).flatMap((member) => flattenUnion(member));
  }
  return [type];
}

/** Names of the error types listed in a `Throws<...>` / `mightThrow<...>` argument list. */
function errorNamesFromTypeArguments(
  typeArguments: AstNode | null,
  sourceText: (node: AstNode) => string
): string[] {
  if (!typeArguments) return [];
  const params = (typeArguments.params as AstNode[] | undefined) ?? [];

  const names = params
    .flatMap((param) => flattenUnion(param))
    .map((type) => {
      if (type.type === "TSTypeReference") {
        return typeReferenceName(type.typeName as AstNode) ?? sourceText(type);
      }
      return sourceText(type);
    });

  return [...new Set(names)];
}

/** A `Throws<...>` reference found anywhere inside a type annotation. */
function findThrowsReference(node: AstNode | null): AstNode | null {
  const type = unwrapType(node);
  if (!type) return null;

  if (type.type === "TSTypeReference") {
    if (typeReferenceName(type.typeName as AstNode) === "Throws") return type;
    // Look inside wrappers such as `Promise<T & Throws<E>>`.
    const typeArguments = type.typeArguments as AstNode | null | undefined;
    for (const param of (typeArguments?.params as AstNode[] | undefined) ?? []) {
      const found = findThrowsReference(param);
      if (found) return found;
    }
    return null;
  }

  if (type.type === "TSUnionType" || type.type === "TSIntersectionType") {
    for (const member of type.types as AstNode[]) {
      const found = findThrowsReference(member);
      if (found) return found;
    }
  }

  return null;
}

export interface DeclaredThrows {
  /** Where the declaration was found, or `null` when the function declares nothing. */
  kind: "returnType" | "mightThrow" | null;
  /** Error type names named in the declaration. */
  errors: string[];
  /** The `<...>` node to patch when adding another error type. */
  typeArguments: AstNode | null;
}

/**
 * Reads the errors a function declares, either from a `Throws<E>` in its return
 * type annotation or from a `tc(value).mightThrow<E>()` return expression.
 *
 * Oxlint JS plugins have no type information, so only declarations written at
 * the function itself are visible — an alias or an inherited signature is not.
 */
export function getDeclaredThrows(
  node: FunctionLikeNode,
  context: Context
): DeclaredThrows {
  const sourceText = (target: AstNode) => context.sourceCode.getText(target);
  const returnType = node.returnType as AstNode | null | undefined;
  const throwsReference = findThrowsReference(
    (returnType?.typeAnnotation as AstNode | undefined) ?? null
  );

  if (throwsReference) {
    const typeArguments = (throwsReference.typeArguments as AstNode | null) ?? null;
    return {
      kind: "returnType",
      errors: errorNamesFromTypeArguments(typeArguments, sourceText),
      typeArguments,
    };
  }

  const mightThrow = getMightThrowCall(getReturnedExpression(node));
  if (mightThrow) {
    return {
      kind: "mightThrow",
      errors: errorNamesFromTypeArguments(mightThrow.typeArguments, sourceText),
      typeArguments: mightThrow.typeArguments,
    };
  }

  return { kind: null, errors: [], typeArguments: null };
}

/** True when a thrown error is covered by the declared error types. */
export function isErrorDeclared(thrownErrorName: string, declaredErrors: string[]): boolean {
  return declaredErrors.includes(thrownErrorName) || declaredErrors.includes("Error");
}

/** True when the node is inside a `tryCatch(...)` call, including its callback. */
export function isInsideTryCatch(node: AstNode): boolean {
  let current = node.parent ?? null;
  while (current) {
    if (current.type === "CallExpression") {
      const callee = unwrapExpression(current.callee as AstNode);
      if (callee?.type === "Identifier" && callee.name === "tryCatch") return true;
    }
    current = current.parent ?? null;
  }
  return false;
}

/** Narrows an oxlint AST node to the loose shape these helpers work with. */
export function toAstNode(node: ESTree.Node): AstNode {
  return node as unknown as AstNode;
}
