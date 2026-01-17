import { RuleTester } from "@typescript-eslint/rule-tester";
import { noUnhandledThrows } from "../src/rules/no-unhandled-throws";
import { describe, it, afterAll } from "vitest";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  parser: "@typescript-eslint/parser",
});

ruleTester.run("no-unhandled-throws", noUnhandledThrows, {
  valid: [
    // Error checked with if/else
    {
      code: `
        const [data, error] = tryCatch(() => riskyFn());
        if (error) {
          console.log(error);
        } else {
          console.log(data);
        }
      `,
    },
    // Error checked with early return
    {
      code: `
        function test() {
          const [data, error] = tryCatch(() => riskyFn());
          if (error) {
            return;
          }
          console.log(data);
        }
      `,
    },
    // Error checked with early throw
    {
      code: `
        function test() {
          const [data, error] = tryCatch(() => riskyFn());
          if (error) {
            throw error;
          }
          console.log(data);
        }
      `,
    },
    // Negated error check
    {
      code: `
        const [data, error] = tryCatch(() => riskyFn());
        if (!error) {
          console.log(data);
        }
      `,
    },
    // Error compared to null
    {
      code: `
        const [data, error] = tryCatch(() => riskyFn());
        if (error === null) {
          console.log(data);
        }
      `,
    },
    // Await tryCatch with error check
    {
      code: `
        async function test() {
          const [data, error] = await tryCatch(() => asyncFn());
          if (error) {
            return;
          }
          console.log(data);
        }
      `,
    },
    // Not a tryCatch call - should be ignored
    {
      code: `
        const [data, error] = someOtherFn();
        console.log(data);
      `,
    },
    // Different variable names
    {
      code: `
        const [result, err] = tryCatch(() => riskyFn());
        if (err) {
          return;
        }
        console.log(result);
      `,
    },
  ],
  invalid: [
    // Using data without checking error
    {
      code: `
        const [data, error] = tryCatch(() => riskyFn());
        console.log(data);
      `,
      errors: [{ messageId: "noUnhandledThrows" }],
    },
    // Using data before error check
    {
      code: `
        const [data, error] = tryCatch(() => riskyFn());
        console.log(data);
        if (error) {
          console.log(error);
        }
      `,
      errors: [{ messageId: "noUnhandledThrows" }],
    },
    // Using data in wrong branch
    {
      code: `
        const [data, error] = tryCatch(() => riskyFn());
        if (error) {
          console.log(data);
        }
      `,
      errors: [{ messageId: "noUnhandledThrows" }],
    },
    // Async without check
    {
      code: `
        async function test() {
          const [data, error] = await tryCatch(() => asyncFn());
          return data;
        }
      `,
      errors: [{ messageId: "noUnhandledThrows" }],
    },
  ],
});
