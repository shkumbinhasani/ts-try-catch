import { describe, it, expect } from "vitest";
import { tryCatch, tc } from "../src/index";

describe("tryCatch", () => {
  describe("synchronous functions", () => {
    it("returns [data, null] on success", () => {
      const [data, error] = tryCatch(() => "success");
      expect(data).toBe("success");
      expect(error).toBeNull();
    });

    it("returns [null, error] on failure", () => {
      const testError = new Error("test error");
      const [data, error] = tryCatch(() => {
        throw testError;
      });
      expect(data).toBeNull();
      expect(error).toBe(testError);
    });

    it("handles functions that return objects", () => {
      const obj = { id: 1, name: "test" };
      const [data, error] = tryCatch(() => obj);
      expect(data).toEqual(obj);
      expect(error).toBeNull();
    });

    it("handles functions that return null", () => {
      const [data, error] = tryCatch(() => null);
      expect(data).toBeNull();
      expect(error).toBeNull();
    });

    it("handles functions that return undefined", () => {
      const [data, error] = tryCatch(() => undefined);
      expect(data).toBeUndefined();
      expect(error).toBeNull();
    });

    it("catches custom error types", () => {
      class CustomError extends Error {
        code = "CUSTOM";
      }
      const [data, error] = tryCatch(() => {
        throw new CustomError("custom");
      });
      expect(data).toBeNull();
      expect(error).toBeInstanceOf(CustomError);
      expect((error as CustomError).code).toBe("CUSTOM");
    });
  });

  describe("asynchronous functions", () => {
    it("returns [data, null] on async success", async () => {
      const [data, error] = await tryCatch(async () => "async success");
      expect(data).toBe("async success");
      expect(error).toBeNull();
    });

    it("returns [null, error] on async failure", async () => {
      const testError = new Error("async error");
      const [data, error] = await tryCatch(async () => {
        throw testError;
      });
      expect(data).toBeNull();
      expect(error).toBe(testError);
    });

    it("handles Promise.resolve", async () => {
      const [data, error] = await tryCatch(() => Promise.resolve(42));
      expect(data).toBe(42);
      expect(error).toBeNull();
    });

    it("handles Promise.reject", async () => {
      const testError = new Error("rejected");
      const [data, error] = await tryCatch(() => Promise.reject(testError));
      expect(data).toBeNull();
      expect(error).toBe(testError);
    });

    it("handles delayed async operations", async () => {
      const [data, error] = await tryCatch(
        () => new Promise((resolve) => setTimeout(() => resolve("delayed"), 10))
      );
      expect(data).toBe("delayed");
      expect(error).toBeNull();
    });
  });
});

describe("tc", () => {
  it("returns the same value via mightThrow()", () => {
    const value = { id: 1, name: "test" };
    const result = tc(value).mightThrow();
    expect(result).toBe(value);
  });

  it("works with primitive values", () => {
    expect(tc("string").mightThrow()).toBe("string");
    expect(tc(42).mightThrow()).toBe(42);
    expect(tc(true).mightThrow()).toBe(true);
  });

  it("works with null and undefined", () => {
    expect(tc(null).mightThrow()).toBeNull();
    expect(tc(undefined).mightThrow()).toBeUndefined();
  });

  it("preserves object reference", () => {
    const obj = { nested: { value: 1 } };
    const result = tc(obj).mightThrow();
    expect(result).toBe(obj);
    result.nested.value = 2;
    expect(obj.nested.value).toBe(2);
  });
});
