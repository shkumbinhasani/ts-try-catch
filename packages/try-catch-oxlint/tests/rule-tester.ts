import { describe, it } from "vitest";
import { RuleTester } from "oxlint/plugins-dev";

// Oxlint's RuleTester picks up `describe`/`it` from globals, which vitest only
// defines when `globals: true` is configured. Wire vitest's own in instead.
RuleTester.describe = describe as unknown as typeof RuleTester.describe;
RuleTester.it = it as unknown as typeof RuleTester.it;

/** A tester that parses each test case as TypeScript. */
export function createRuleTester(): RuleTester {
  return new RuleTester({
    languageOptions: { parserOptions: { lang: "ts" } },
  });
}
