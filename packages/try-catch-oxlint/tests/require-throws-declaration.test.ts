import { requireThrowsDeclaration } from "../src/rules/require-throws-declaration.js";
import { runRuleTests } from "./rule-tester.js";

await runRuleTests("require-throws-declaration", requireThrowsDeclaration, {
  valid: [
    // Declared through the return type annotation.
    `function fetchUser(id: string): Throws<ValidationError> {
      throw new ValidationError("id required");
    }`,
    // Declared through the awaited result of a promise.
    `async function fetchUser(id: string): Promise<User & Throws<NetworkError>> {
      throw new NetworkError("offline");
    }`,
    // Declared through tc().mightThrow<>().
    `function getConfig() {
      if (!exists) throw new ConfigError("missing");
      return tc(config).mightThrow<ConfigError>();
    }`,
    // Throws<Error> covers every error subclass.
    `function parse(input: string): Throws<Error> {
      throw new ValidationError("bad input");
    }`,
    // Caught locally, so the error never leaves the function.
    `function safe() {
      try {
        throw new ValidationError("bad");
      } catch (error) {
        return null;
      }
    }`,
    // Module-level throws are not the rule's concern.
    `throw new Error("boom");`,
    // Arrow function with the declaration on the annotation.
    `const parse = (input: string): Throws<ValidationError> => {
      throw new ValidationError("bad input");
    };`,
  ],
  invalid: [
    {
      name: "function without any Throws<> declaration",
      code: `function fetchUser(id: string) {
  throw new ValidationError("id required");
}`,
      errors: [
        {
          messageId: "missingThrowsDeclaration",
          data: { name: "fetchUser", errorName: "ValidationError" },
          suggestions: [
            {
              messageId: "suggestAddThrowsToReturnType",
              output: `function fetchUser(id: string): Throws<ValidationError> {
  throw new ValidationError("id required");
}`,
            },
          ],
        },
      ],
    },
    {
      name: "throw of an error missing from the declared union",
      code: `function fetchUser(id: string): Throws<ValidationError> {
  throw new NetworkError("offline");
}`,
      errors: [
        {
          messageId: "errorNotInThrowsDeclaration",
          data: {
            name: "fetchUser",
            errorName: "NetworkError",
            declaredErrors: "ValidationError",
          },
          suggestions: [
            {
              messageId: "suggestAddErrorToThrows",
              output: `function fetchUser(id: string): Throws<ValidationError | NetworkError> {
  throw new NetworkError("offline");
}`,
            },
          ],
        },
      ],
    },
    {
      name: "throw of an error missing from a mightThrow<> declaration",
      code: `function getConfig() {
  if (!exists) throw new FileNotFoundError("missing");
  return tc(config).mightThrow<ConfigError>();
}`,
      errors: [
        {
          messageId: "errorNotInThrowsDeclaration",
          data: {
            name: "getConfig",
            errorName: "FileNotFoundError",
            declaredErrors: "ConfigError",
          },
          suggestions: [
            {
              messageId: "suggestAddErrorToThrows",
              output: `function getConfig() {
  if (!exists) throw new FileNotFoundError("missing");
  return tc(config).mightThrow<ConfigError | FileNotFoundError>();
}`,
            },
          ],
        },
      ],
    },
    {
      name: "existing annotation is intersected with Throws<>",
      code: `function parse(input: string): Config {
  throw new ValidationError("bad input");
}`,
      errors: [
        {
          messageId: "missingThrowsDeclaration",
          suggestions: [
            {
              messageId: "suggestAddThrowsToReturnType",
              output: `function parse(input: string): Config & Throws<ValidationError> {
  throw new ValidationError("bad input");
}`,
            },
          ],
        },
      ],
    },
    {
      name: "Promise annotation keeps Throws<> inside the promise",
      code: `async function fetchUser(id: string): Promise<User> {
  throw new NetworkError("offline");
}`,
      errors: [
        {
          messageId: "missingThrowsDeclaration",
          suggestions: [
            {
              messageId: "suggestAddThrowsToReturnType",
              output: `async function fetchUser(id: string): Promise<User & Throws<NetworkError>> {
  throw new NetworkError("offline");
}`,
            },
          ],
        },
      ],
    },
    {
      name: "returned value can be wrapped with tc().mightThrow<>()",
      code: `function getConfig() {
  if (!exists) throw new ConfigError("missing");
  return config;
}`,
      errors: [
        {
          messageId: "missingThrowsDeclaration",
          suggestions: [
            {
              messageId: "suggestWrapReturnWithTc",
              output: `function getConfig() {
  if (!exists) throw new ConfigError("missing");
  return tc(config).mightThrow<ConfigError>();
}`,
            },
            {
              messageId: "suggestAddThrowsToReturnType",
              output: `function getConfig(): Throws<ConfigError> {
  if (!exists) throw new ConfigError("missing");
  return config;
}`,
            },
          ],
        },
      ],
    },
    {
      name: "thrown value without a name",
      code: `function fail() {
  throw "oops";
}`,
      errors: [
        {
          messageId: "missingThrowsDeclarationUnknown",
          data: { name: "fail" },
        },
      ],
    },
    {
      name: "try/finally does not catch",
      code: `function fail() {
  try {
    throw new ValidationError("bad");
  } finally {
    cleanup();
  }
}`,
      errors: [{ messageId: "missingThrowsDeclaration" }],
    },
  ],
});
