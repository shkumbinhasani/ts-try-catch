import { RuleTester } from "@typescript-eslint/rule-tester";
import { requireTryCatch } from "../src/rules/require-try-catch";
import { describe, it, afterAll } from "vitest";
import * as path from "path";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.test.json",
    tsconfigRootDir: path.join(__dirname),
  },
});

ruleTester.run("require-try-catch", requireTryCatch, {
  valid: [
    // Function with Throws<> wrapped in tryCatch
    {
      filename: path.join(__dirname, "file.ts"),
      code: `
        type Throws<T extends Error> = { __error?: T };
        class CustomError extends Error {}
        function riskyFn(): string & Throws<CustomError> {
          return "ok";
        }
        function tryCatch<T>(fn: () => T): [T, null] | [null, Error] {
          try { return [fn(), null]; } catch (e) { return [null, e as Error]; }
        }
        const [data, error] = tryCatch(() => riskyFn());
      `,
    },
    // Regular function without Throws<>
    {
      filename: path.join(__dirname, "file.ts"),
      code: `
        function safeFn(): string {
          return "ok";
        }
        const result = safeFn();
      `,
    },
    // tc() call should be ignored
    {
      filename: path.join(__dirname, "file.ts"),
      code: `
        type Throws<T extends Error> = { __error?: T };
        function tc<T>(value: T): { mightThrow<E extends Error>(): T & Throws<E> } {
          return { mightThrow: () => value as any };
        }
        tc("value").mightThrow();
      `,
    },
    // tryCatch call itself should be ignored
    {
      filename: path.join(__dirname, "file.ts"),
      code: `
        function tryCatch<T>(fn: () => T): [T, null] | [null, Error] {
          try { return [fn(), null]; } catch (e) { return [null, e as Error]; }
        }
        tryCatch(() => "test");
      `,
    },
    // Nested inside tryCatch callback
    {
      filename: path.join(__dirname, "file.ts"),
      code: `
        type Throws<T extends Error> = { __error?: T };
        class CustomError extends Error {}
        function riskyFn(): string & Throws<CustomError> {
          return "ok";
        }
        function tryCatch<T>(fn: () => T): [T, null] | [null, Error] {
          try { return [fn(), null]; } catch (e) { return [null, e as Error]; }
        }
        tryCatch(() => {
          return riskyFn();
        });
      `,
    },
  ],
  invalid: [
    // Function with Throws<> not wrapped
    {
      filename: path.join(__dirname, "file.ts"),
      code: `
        type Throws<T extends Error> = { __error?: T };
        class CustomError extends Error {}
        function riskyFn(): string & Throws<CustomError> {
          return "ok";
        }
        const result = riskyFn();
      `,
      errors: [{ messageId: "requireTryCatch", data: { name: "riskyFn" } }],
    },
    // Async function with Throws<>
    {
      filename: path.join(__dirname, "file.ts"),
      code: `
        type Throws<T extends Error> = { __error?: T };
        class CustomError extends Error {}
        async function asyncRiskyFn(): Promise<string & Throws<CustomError>> {
          return "ok";
        }
        asyncRiskyFn();
      `,
      errors: [
        { messageId: "requireTryCatch", data: { name: "asyncRiskyFn" } },
      ],
    },
  ],
});
