import { describe, it } from "vitest";
import type { Rule } from "@oxlint/plugins";

/**
 * Oxlint's `RuleTester` parses through raw transfer, which it only supports on
 * Node >= 22 (and 64-bit little-endian). Below that it throws on every test
 * case, so the suite is skipped instead — the rules themselves run anywhere
 * oxlint runs, and CI still typechecks and builds them on older Node versions.
 */
const RULE_TESTER_SUPPORTED = Number(process.versions.node.split(".")[0]) >= 22;

type TestCases = Parameters<
  import("oxlint/plugins-dev").RuleTester["run"]
>[2];

/** Runs a rule's test cases, skipping them where `RuleTester` is unsupported. */
export async function runRuleTests(
  ruleName: string,
  rule: Rule,
  cases: TestCases
): Promise<void> {
  if (!RULE_TESTER_SUPPORTED) {
    describe(ruleName, () => {
      it.skip(
        `oxlint RuleTester requires Node >= 22 (running ${process.versions.node})`,
        () => {}
      );
    });
    return;
  }

  // Imported lazily so older Node versions never load the raw-transfer parser.
  const { RuleTester } = await import("oxlint/plugins-dev");
  RuleTester.describe = describe as unknown as typeof RuleTester.describe;
  RuleTester.it = it as unknown as typeof RuleTester.it;

  new RuleTester({
    languageOptions: { parserOptions: { lang: "ts" } },
  }).run(ruleName, rule, cases);
}
