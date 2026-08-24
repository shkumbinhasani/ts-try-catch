import { requireTryCatch } from "../src/rules/require-try-catch.js";
import { runRuleTests } from "./rule-tester.js";

await runRuleTests("require-try-catch", requireTryCatch, {
  valid: [
    // Wrapped in tryCatch().
    `function fetchUser(id: string): Throws<NetworkError> {
      throw new NetworkError("offline");
    }
    const [user, error] = tryCatch(() => fetchUser("1"));`,
    // Awaited inside tryCatch().
    `async function fetchUser(id: string): Promise<User & Throws<NetworkError>> {
      throw new NetworkError("offline");
    }
    const [user, error] = await tryCatch(() => fetchUser("1"));`,
    // The callee declares nothing, so it is none of this rule's business.
    `function add(a: number, b: number): number {
      return a + b;
    }
    add(1, 2);`,
    // Declared in another file: no type information, so nothing is reported.
    `import { fetchUser } from "./api";
    fetchUser("1");`,
    // tc() and mightThrow() only declare errors, they never catch.
    `function getConfig() {
      if (!exists) throw new ConfigError("missing");
      return tc(config).mightThrow<ConfigError>();
    }
    const [config, error] = tryCatch(() => getConfig());`,
  ],
  invalid: [
    {
      name: "call to a Throws<>-declaring function declaration",
      code: `function fetchUser(id: string): Throws<NetworkError> {
  throw new NetworkError("offline");
}
const user = fetchUser("1");`,
      errors: [
        {
          messageId: "requireTryCatch",
          data: { name: "fetchUser" },
          suggestions: [
            {
              messageId: "suggestWrapInTryCatch",
              output: `function fetchUser(id: string): Throws<NetworkError> {
  throw new NetworkError("offline");
}
const user = tryCatch(() => fetchUser("1"));`,
            },
          ],
        },
      ],
    },
    {
      name: "call to a Throws<>-declaring arrow function",
      code: `const fetchUser = (id: string): Throws<NetworkError> => {
  throw new NetworkError("offline");
};
const user = fetchUser("1");`,
      errors: [
        {
          messageId: "requireTryCatch",
          data: { name: "fetchUser" },
          suggestions: [
            {
              messageId: "suggestWrapInTryCatch",
              output: `const fetchUser = (id: string): Throws<NetworkError> => {
  throw new NetworkError("offline");
};
const user = tryCatch(() => fetchUser("1"));`,
            },
          ],
        },
      ],
    },
    {
      name: "call to a function declaring errors via tc().mightThrow<>()",
      code: `function getConfig() {
  if (!exists) throw new ConfigError("missing");
  return tc(config).mightThrow<ConfigError>();
}
const config = getConfig();`,
      errors: [
        {
          messageId: "requireTryCatch",
          data: { name: "getConfig" },
          suggestions: [
            {
              messageId: "suggestWrapInTryCatch",
              output: `function getConfig() {
  if (!exists) throw new ConfigError("missing");
  return tc(config).mightThrow<ConfigError>();
}
const config = tryCatch(() => getConfig());`,
            },
          ],
        },
      ],
    },
    {
      name: "call placed before the declaration it refers to",
      code: `const user = fetchUser("1");
function fetchUser(id: string): Throws<NetworkError> {
  throw new NetworkError("offline");
}`,
      errors: [{ messageId: "requireTryCatch", data: { name: "fetchUser" } }],
    },
  ],
});
