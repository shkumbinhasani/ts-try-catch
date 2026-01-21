import { RuleTester } from "@typescript-eslint/rule-tester";
import { requireThrowsDeclaration } from "../src/rules/require-throws-declaration.js";
import { describe, it, afterAll } from "vitest";
import parser from "@typescript-eslint/parser";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      projectService: {
        allowDefaultProject: ["*.ts"],
      },
      tsconfigRootDir: __dirname,
    },
  },
});

ruleTester.run("require-throws-declaration", requireThrowsDeclaration, {
  valid: [
    // Function with throw that declares correct error using tc().mightThrow()
    {
      filename: join(__dirname, "file.ts"),
      code: `
        type Throws<T extends Error> = { __error?: T };
        function tc<T>(value: T): { mightThrow<E extends Error>(): T & Throws<E> } {
          return { mightThrow: () => value as any };
        }
        class ValidationError extends Error {}
        function parseData(input: string) {
          if (!input) {
            throw new ValidationError("Input cannot be empty");
          }
          return tc({ parsed: input }).mightThrow<ValidationError>();
        }
      `,
    },
    // Function with throw that declares Throws<> in return type annotation
    {
      filename: join(__dirname, "file.ts"),
      code: `
        type Throws<T extends Error> = { __error?: T };
        class ValidationError extends Error {}
        function parseData(input: string): { parsed: string } & Throws<ValidationError> {
          if (!input) {
            throw new ValidationError("Input cannot be empty");
          }
          return { parsed: input } as { parsed: string } & Throws<ValidationError>;
        }
      `,
    },
    // Async function with throw that declares Throws<> in Promise
    {
      filename: join(__dirname, "file.ts"),
      code: `
        type Throws<T extends Error> = { __error?: T };
        function tc<T>(value: T): { mightThrow<E extends Error>(): T & Throws<E> } {
          return { mightThrow: () => value as any };
        }
        class NetworkError extends Error {}
        async function fetchData(url: string) {
          if (!url) {
            throw new NetworkError("URL is required");
          }
          return tc({ data: "result" }).mightThrow<NetworkError>();
        }
      `,
    },
    // Function without throw - no declaration needed
    {
      filename: join(__dirname, "file.ts"),
      code: `
        function safeFn(input: string) {
          return { value: input };
        }
      `,
    },
    // Throw inside try block (caught locally) - no declaration needed
    {
      filename: join(__dirname, "file.ts"),
      code: `
        class CustomError extends Error {}
        function handleWithTry(input: string) {
          try {
            if (!input) {
              throw new CustomError("error");
            }
            return { value: input };
          } catch (e) {
            return { value: "default" };
          }
        }
      `,
    },
    // Re-throwing in catch with correct Throws<> declaration
    {
      filename: join(__dirname, "file.ts"),
      code: `
        type Throws<T extends Error> = { __error?: T };
        function tc<T>(value: T): { mightThrow<E extends Error>(): T & Throws<E> } {
          return { mightThrow: () => value as any };
        }
        class CustomError extends Error {}
        function handleWithRethrow(input: string) {
          try {
            JSON.parse(input);
          } catch (e) {
            throw new CustomError("Parse failed");
          }
          return tc({ value: input }).mightThrow<CustomError>();
        }
      `,
    },
    // Multiple throws with union type declaration
    {
      filename: join(__dirname, "file.ts"),
      code: `
        type Throws<T extends Error> = { __error?: T };
        function tc<T>(value: T): { mightThrow<E extends Error>(): T & Throws<E> } {
          return { mightThrow: () => value as any };
        }
        class ErrorA extends Error {}
        class ErrorB extends Error {}
        function multiThrow(input: string) {
          if (!input) {
            throw new ErrorA("A");
          }
          if (input === "bad") {
            throw new ErrorB("B");
          }
          return tc({ value: input }).mightThrow<ErrorA | ErrorB>();
        }
      `,
    },
  ],
  invalid: [
    // Function with throw but no Throws<> declaration
    {
      filename: join(__dirname, "file.ts"),
      code: `
        class ValidationError extends Error {}
        function parseData(input: string) {
          if (!input) {
            throw new ValidationError("Input cannot be empty");
          }
          return { parsed: input };
        }
      `,
      errors: [
        {
          messageId: "missingThrowsDeclaration",
          data: { name: "parseData", errorName: "ValidationError" },
          suggestions: [
            {
              messageId: "suggestWrapReturnWithTc",
              data: { errorName: "ValidationError" },
              output: `
        class ValidationError extends Error {}
        function parseData(input: string) {
          if (!input) {
            throw new ValidationError("Input cannot be empty");
          }
          return tc({ parsed: input }).mightThrow<ValidationError>();
        }
      `,
            },
            {
              messageId: "suggestAddThrowsToReturnType",
              data: { errorName: "ValidationError" },
              output: `
        class ValidationError extends Error {}
        function parseData(input: string): Throws<ValidationError> {
          if (!input) {
            throw new ValidationError("Input cannot be empty");
          }
          return { parsed: input };
        }
      `,
            },
          ],
        },
      ],
    },
    // Async function with throw but no Throws<> declaration
    {
      filename: join(__dirname, "file.ts"),
      code: `
        class NetworkError extends Error {}
        async function fetchData(url: string) {
          if (!url) {
            throw new NetworkError("URL is required");
          }
          return { data: "result" };
        }
      `,
      errors: [
        {
          messageId: "missingThrowsDeclaration",
          data: { name: "fetchData", errorName: "NetworkError" },
          suggestions: [
            {
              messageId: "suggestWrapReturnWithTc",
              data: { errorName: "NetworkError" },
              output: `
        class NetworkError extends Error {}
        async function fetchData(url: string) {
          if (!url) {
            throw new NetworkError("URL is required");
          }
          return tc({ data: "result" }).mightThrow<NetworkError>();
        }
      `,
            },
            {
              messageId: "suggestAddThrowsToReturnType",
              data: { errorName: "NetworkError" },
              output: `
        class NetworkError extends Error {}
        async function fetchData(url: string): Throws<NetworkError> {
          if (!url) {
            throw new NetworkError("URL is required");
          }
          return { data: "result" };
        }
      `,
            },
          ],
        },
      ],
    },
    // Arrow function with throw but no Throws<> declaration
    {
      filename: join(__dirname, "file.ts"),
      code: `
        class CustomError extends Error {}
        const process = (input: string) => {
          if (!input) {
            throw new CustomError("error");
          }
          return input;
        };
      `,
      errors: [
        {
          messageId: "missingThrowsDeclaration",
          data: { name: "process", errorName: "CustomError" },
          suggestions: [
            {
              messageId: "suggestWrapReturnWithTc",
              data: { errorName: "CustomError" },
              output: `
        class CustomError extends Error {}
        const process = (input: string) => {
          if (!input) {
            throw new CustomError("error");
          }
          return tc(input).mightThrow<CustomError>();
        };
      `,
            },
            {
              messageId: "suggestAddThrowsToReturnType",
              data: { errorName: "CustomError" },
              output: `
        class CustomError extends Error {}
        const process = (input: string): Throws<CustomError> => {
          if (!input) {
            throw new CustomError("error");
          }
          return input;
        };
      `,
            },
          ],
        },
      ],
    },
    // Multiple throws without declaration
    {
      filename: join(__dirname, "file.ts"),
      code: `
        class ErrorA extends Error {}
        class ErrorB extends Error {}
        function multiThrow(input: string) {
          if (!input) {
            throw new ErrorA("A");
          }
          if (input === "bad") {
            throw new ErrorB("B");
          }
          return { value: input };
        }
      `,
      errors: [
        {
          messageId: "missingThrowsDeclaration",
          data: { name: "multiThrow", errorName: "ErrorA" },
          suggestions: [
            {
              messageId: "suggestWrapReturnWithTc",
              data: { errorName: "ErrorA" },
              output: `
        class ErrorA extends Error {}
        class ErrorB extends Error {}
        function multiThrow(input: string) {
          if (!input) {
            throw new ErrorA("A");
          }
          if (input === "bad") {
            throw new ErrorB("B");
          }
          return tc({ value: input }).mightThrow<ErrorA>();
        }
      `,
            },
            {
              messageId: "suggestAddThrowsToReturnType",
              data: { errorName: "ErrorA" },
              output: `
        class ErrorA extends Error {}
        class ErrorB extends Error {}
        function multiThrow(input: string): Throws<ErrorA> {
          if (!input) {
            throw new ErrorA("A");
          }
          if (input === "bad") {
            throw new ErrorB("B");
          }
          return { value: input };
        }
      `,
            },
          ],
        },
        {
          messageId: "missingThrowsDeclaration",
          data: { name: "multiThrow", errorName: "ErrorB" },
          suggestions: [
            {
              messageId: "suggestWrapReturnWithTc",
              data: { errorName: "ErrorB" },
              output: `
        class ErrorA extends Error {}
        class ErrorB extends Error {}
        function multiThrow(input: string) {
          if (!input) {
            throw new ErrorA("A");
          }
          if (input === "bad") {
            throw new ErrorB("B");
          }
          return tc({ value: input }).mightThrow<ErrorB>();
        }
      `,
            },
            {
              messageId: "suggestAddThrowsToReturnType",
              data: { errorName: "ErrorB" },
              output: `
        class ErrorA extends Error {}
        class ErrorB extends Error {}
        function multiThrow(input: string): Throws<ErrorB> {
          if (!input) {
            throw new ErrorA("A");
          }
          if (input === "bad") {
            throw new ErrorB("B");
          }
          return { value: input };
        }
      `,
            },
          ],
        },
      ],
    },
    // Throwing generic Error
    {
      filename: join(__dirname, "file.ts"),
      code: `
        function throwsGeneric(input: string) {
          if (!input) {
            throw new Error("generic error");
          }
          return { value: input };
        }
      `,
      errors: [
        {
          messageId: "missingThrowsDeclaration",
          data: { name: "throwsGeneric", errorName: "Error" },
          suggestions: [
            {
              messageId: "suggestWrapReturnWithTc",
              data: { errorName: "Error" },
              output: `
        function throwsGeneric(input: string) {
          if (!input) {
            throw new Error("generic error");
          }
          return tc({ value: input }).mightThrow<Error>();
        }
      `,
            },
            {
              messageId: "suggestAddThrowsToReturnType",
              data: { errorName: "Error" },
              output: `
        function throwsGeneric(input: string): Throws<Error> {
          if (!input) {
            throw new Error("generic error");
          }
          return { value: input };
        }
      `,
            },
          ],
        },
      ],
    },
    // Re-throwing in catch without Throws<> declaration
    {
      filename: join(__dirname, "file.ts"),
      code: `
        class CustomError extends Error {}
        function handleWithRethrow(input: string) {
          try {
            JSON.parse(input);
          } catch (e) {
            throw new CustomError("Parse failed");
          }
          return { value: input };
        }
      `,
      errors: [
        {
          messageId: "missingThrowsDeclaration",
          data: { name: "handleWithRethrow", errorName: "CustomError" },
          suggestions: [
            {
              messageId: "suggestWrapReturnWithTc",
              data: { errorName: "CustomError" },
              output: `
        class CustomError extends Error {}
        function handleWithRethrow(input: string) {
          try {
            JSON.parse(input);
          } catch (e) {
            throw new CustomError("Parse failed");
          }
          return tc({ value: input }).mightThrow<CustomError>();
        }
      `,
            },
            {
              messageId: "suggestAddThrowsToReturnType",
              data: { errorName: "CustomError" },
              output: `
        class CustomError extends Error {}
        function handleWithRethrow(input: string): Throws<CustomError> {
          try {
            JSON.parse(input);
          } catch (e) {
            throw new CustomError("Parse failed");
          }
          return { value: input };
        }
      `,
            },
          ],
        },
      ],
    },
    // WRONG ERROR DECLARED: Throws ValidationError but declares NetworkError
    {
      filename: join(__dirname, "file.ts"),
      code: `
        type Throws<T extends Error> = { __error?: T };
        function tc<T>(value: T): { mightThrow<E extends Error>(): T & Throws<E> } {
          return { mightThrow: () => value as any };
        }
        class ValidationError extends Error {}
        class NetworkError extends Error {}
        function parseData(input: string) {
          if (!input) {
            throw new ValidationError("Input cannot be empty");
          }
          return tc({ parsed: input }).mightThrow<NetworkError>();
        }
      `,
      errors: [
        {
          messageId: "errorNotInThrowsDeclaration",
          suggestions: [
            {
              messageId: "suggestAddErrorToThrows",
              data: { errorName: "ValidationError" },
              output: `
        type Throws<T extends Error> = { __error?: T };
        function tc<T>(value: T): { mightThrow<E extends Error>(): T & Throws<E> } {
          return { mightThrow: () => value as any };
        }
        class ValidationError extends Error {}
        class NetworkError extends Error {}
        function parseData(input: string) {
          if (!input) {
            throw new ValidationError("Input cannot be empty");
          }
          return tc({ parsed: input }).mightThrow<NetworkError | ValidationError>();
        }
      `,
            },
          ],
        },
      ],
    },
    // MISSING ONE ERROR: Throws two errors but only declares one
    {
      filename: join(__dirname, "file.ts"),
      code: `
        type Throws<T extends Error> = { __error?: T };
        function tc<T>(value: T): { mightThrow<E extends Error>(): T & Throws<E> } {
          return { mightThrow: () => value as any };
        }
        class ErrorA extends Error {}
        class ErrorB extends Error {}
        function multiThrow(input: string) {
          if (!input) {
            throw new ErrorA("A");
          }
          if (input === "bad") {
            throw new ErrorB("B");
          }
          return tc({ value: input }).mightThrow<ErrorA>();
        }
      `,
      errors: [
        {
          messageId: "errorNotInThrowsDeclaration",
          suggestions: [
            {
              messageId: "suggestAddErrorToThrows",
              data: { errorName: "ErrorB" },
              output: `
        type Throws<T extends Error> = { __error?: T };
        function tc<T>(value: T): { mightThrow<E extends Error>(): T & Throws<E> } {
          return { mightThrow: () => value as any };
        }
        class ErrorA extends Error {}
        class ErrorB extends Error {}
        function multiThrow(input: string) {
          if (!input) {
            throw new ErrorA("A");
          }
          if (input === "bad") {
            throw new ErrorB("B");
          }
          return tc({ value: input }).mightThrow<ErrorA | ErrorB>();
        }
      `,
            },
          ],
        },
      ],
    },
  ],
});
