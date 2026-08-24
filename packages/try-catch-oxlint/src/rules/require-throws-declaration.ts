import { defineRule } from "@oxlint/plugins";
import type { Context, ESTree, Fix, Fixer, Suggestion } from "@oxlint/plugins";
import {
  getContainingFunction,
  getDeclaredThrows,
  getFunctionName,
  getMightThrowCall,
  getReturnedExpression,
  getThrownErrorName,
  isCaughtLocally,
  isErrorDeclared,
  toAstNode,
  type AstNode,
  type FunctionLikeNode,
} from "../utils.js";

/**
 * Builds the suggestion that wraps the returned value with
 * `tc(value).mightThrow<E>()`.
 */
function wrapReturnSuggestion(
  fn: FunctionLikeNode,
  errorName: string,
  context: Context
): Suggestion | null {
  const returned = getReturnedExpression(fn);
  if (!returned || getMightThrowCall(returned)) return null;

  const returnedText = context.sourceCode.getText(returned);
  return {
    messageId: "suggestWrapReturnWithTc",
    data: { errorName },
    fix: (fixer: Fixer): Fix =>
      fixer.replaceText(returned, `tc(${returnedText}).mightThrow<${errorName}>()`),
  };
}

/**
 * Builds the suggestion that adds `Throws<E>` to the function's return type,
 * either by intersecting the existing annotation or by adding one.
 */
function returnTypeSuggestion(
  fn: FunctionLikeNode,
  errorName: string,
  context: Context
): Suggestion | null {
  const returnType = fn.returnType as AstNode | null | undefined;

  if (returnType) {
    const annotation = returnType.typeAnnotation as AstNode;
    const annotationText = context.sourceCode.getText(annotation);

    // `Promise<T>` becomes `Promise<T & Throws<E>>` so the error type survives `await`.
    if (annotation.type === "TSTypeReference") {
      const typeName = annotation.typeName as AstNode;
      const params = (annotation.typeArguments as AstNode | null)?.params as
        | AstNode[]
        | undefined;

      if (
        typeName.type === "Identifier" &&
        typeName.name === "Promise" &&
        params?.length === 1
      ) {
        const resolved = params[0]!;
        const resolvedText = context.sourceCode.getText(resolved);
        const needsParens = resolved.type === "TSUnionType";
        const inner = needsParens ? `(${resolvedText})` : resolvedText;

        return {
          messageId: "suggestAddThrowsToReturnType",
          data: { errorName },
          fix: (fixer: Fixer): Fix =>
            fixer.replaceText(resolved, `${inner} & Throws<${errorName}>`),
        };
      }
    }

    const needsParens = annotation.type === "TSUnionType";
    const base = needsParens ? `(${annotationText})` : annotationText;
    return {
      messageId: "suggestAddThrowsToReturnType",
      data: { errorName },
      fix: (fixer: Fixer): Fix =>
        fixer.replaceText(annotation, `${base} & Throws<${errorName}>`),
    };
  }

  // No annotation: insert one after the parameter list.
  const closingParen = context.sourceCode.getTokenBefore(
    fn.body as unknown as ESTree.Node,
    (token) => token.value === ")"
  );
  if (!closingParen) return null;

  return {
    messageId: "suggestAddThrowsToReturnType",
    data: { errorName },
    fix: (fixer: Fixer): Fix =>
      fixer.insertTextAfter(closingParen, `: Throws<${errorName}>`),
  };
}

export const requireThrowsDeclaration = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Require functions with throw statements to declare Throws<> in their return type",
      url: "https://github.com/shkumbinhasani/ts-try-catch/tree/main/packages/try-catch-oxlint#require-throws-declaration",
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
      suggestAddThrowsToReturnType: "Add Throws<{{errorName}}> to function return type",
      suggestAddErrorToThrows: "Add '{{errorName}}' to existing Throws<> declaration",
    },
    schema: [],
  },
  createOnce(context) {
    return {
      ThrowStatement(node) {
        const throwStatement = toAstNode(node);

        // Caught by an enclosing try/catch, so it never leaves the function.
        if (isCaughtLocally(throwStatement)) return;

        const fn = getContainingFunction(throwStatement);
        if (!fn) return; // Module-level throw, not our concern.

        const name = getFunctionName(fn);
        const errorName = getThrownErrorName(throwStatement);
        const declared = getDeclaredThrows(fn, context);

        if (declared.kind !== null) {
          if (!errorName || isErrorDeclared(errorName, declared.errors)) return;

          const typeArguments = declared.typeArguments;
          const suggest: Suggestion[] = [];

          if (typeArguments) {
            const errors = [...declared.errors, errorName].join(" | ");
            suggest.push({
              messageId: "suggestAddErrorToThrows",
              data: { errorName },
              fix: (fixer: Fixer): Fix => fixer.replaceText(typeArguments, `<${errors}>`),
            });
          }

          context.report({
            node,
            messageId: "errorNotInThrowsDeclaration",
            data: {
              name,
              errorName,
              declaredErrors: declared.errors.join(" | ") || "unknown",
            },
            suggest: suggest.length > 0 ? suggest : null,
          });
          return;
        }

        if (!errorName) {
          // Without an error type name there is nothing to suggest.
          context.report({
            node,
            messageId: "missingThrowsDeclarationUnknown",
            data: { name },
          });
          return;
        }

        const suggest = [
          wrapReturnSuggestion(fn, errorName, context),
          returnTypeSuggestion(fn, errorName, context),
        ].filter((suggestion): suggestion is Suggestion => suggestion !== null);

        context.report({
          node,
          messageId: "missingThrowsDeclaration",
          data: { name, errorName },
          suggest: suggest.length > 0 ? suggest : null,
        });
      },
    };
  },
});
