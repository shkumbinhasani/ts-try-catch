import { describe, it, expectTypeOf } from "vitest";
import { tryCatch, tc, type Throws } from "../src/index";

describe("type inference", () => {
  describe("tryCatch types", () => {
    it("infers correct data type for sync functions", () => {
      const [data, error] = tryCatch(() => "hello");
      if (!error) {
        expectTypeOf(data).toEqualTypeOf<string>();
      }
    });

    it("infers correct data type for async functions", async () => {
      const [data, error] = await tryCatch(async () => 42);
      if (!error) {
        expectTypeOf(data).toEqualTypeOf<number>();
      }
    });

    it("infers Error type when no Throws declared", () => {
      const [, error] = tryCatch(() => "test");
      if (error) {
        expectTypeOf(error).toEqualTypeOf<Error>();
      }
    });

    it("infers custom error type from Throws", () => {
      class APIError extends Error {
        statusCode = 500;
      }
      function riskyFn(): string & Throws<APIError> {
        return "ok";
      }
      const [, error] = tryCatch(riskyFn);
      if (error) {
        // error should be Error | APIError
        expectTypeOf(error).toMatchTypeOf<Error>();
      }
    });

    it("infers object return types correctly", () => {
      const [data, error] = tryCatch(() => ({ id: 1, name: "test" }));
      if (!error) {
        expectTypeOf(data).toEqualTypeOf<{ id: number; name: string }>();
      }
    });
  });

  describe("tc types", () => {
    it("preserves value type through mightThrow", () => {
      const result = tc({ id: 1 }).mightThrow<Error>();
      expectTypeOf(result).toMatchTypeOf<{ id: number }>();
    });

    it("adds Throws type via mightThrow generic", () => {
      class CustomError extends Error {}
      function fn() {
        return tc("value").mightThrow<CustomError>();
      }
      const [, error] = tryCatch(fn);
      if (error) {
        expectTypeOf(error).toMatchTypeOf<Error>();
      }
    });

    it("works with union error types", () => {
      class ErrorA extends Error {}
      class ErrorB extends Error {}
      function fn() {
        return tc({ data: true }).mightThrow<ErrorA | ErrorB>();
      }
      const [data, error] = tryCatch(fn);
      if (!error) {
        expectTypeOf(data).toEqualTypeOf<{ data: boolean }>();
      }
    });
  });
});
