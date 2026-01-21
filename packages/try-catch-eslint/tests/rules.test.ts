import { describe, it, expect } from "vitest";
import plugin from "../src/index";

describe("eslint plugin", () => {
  it("exports plugin metadata", () => {
    expect(plugin.meta.name).toBe("@shkumbinhsn/try-catch-eslint");
    expect(plugin.meta.version).toBe("0.0.3");
  });

  it("exports rules", () => {
    expect(plugin.rules).toHaveProperty("require-try-catch");
    expect(plugin.rules).toHaveProperty("no-unhandled-throws");
    expect(plugin.rules).toHaveProperty("require-throws-declaration");
  });

  it("exports recommended config", () => {
    expect(plugin.configs).toHaveProperty("recommended");
    expect(plugin.configs.recommended.rules).toHaveProperty(
      "@shkumbinhsn/try-catch-eslint/require-try-catch"
    );
    expect(plugin.configs.recommended.rules).toHaveProperty(
      "@shkumbinhsn/try-catch-eslint/no-unhandled-throws"
    );
    expect(plugin.configs.recommended.rules).toHaveProperty(
      "@shkumbinhsn/try-catch-eslint/require-throws-declaration"
    );
  });

  describe("require-try-catch rule", () => {
    it("has correct meta information", () => {
      const rule = plugin.rules["require-try-catch"];
      expect(rule.meta.type).toBe("suggestion");
      expect(rule.meta.docs?.description).toContain("Throws<>");
    });
  });

  describe("no-unhandled-throws rule", () => {
    it("has correct meta information", () => {
      const rule = plugin.rules["no-unhandled-throws"];
      expect(rule.meta.type).toBe("problem");
      expect(rule.meta.docs?.description).toContain("tryCatch");
    });
  });

  describe("require-throws-declaration rule", () => {
    it("has correct meta information", () => {
      const rule = plugin.rules["require-throws-declaration"];
      expect(rule.meta.type).toBe("problem");
      expect(rule.meta.docs?.description).toContain("throw");
    });
  });
});
