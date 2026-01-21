const errorSymbol = Symbol();

type ErrorSymbol = typeof errorSymbol;

export type Throws<T extends Error> = {
  [errorSymbol]?: T;
};

type ExtractErrors<T> = T extends Throws<infer E> ? E : never;

type StripThrows<T> = T extends infer R & Throws<Error> ? R : T;

type DataError<T> = [StripThrows<T>, null] | [null, Error | ExtractErrors<T>];

type TryCatchReturn<T> = T extends Promise<infer R>
  ? Promise<DataError<R>>
  : DataError<T>;

/**
 * Executes a function within a try-catch block and returns a tuple [data, error].
 *
 * @param fn - The function to execute. Can be synchronous or return a Promise.
 * @returns A tuple where:
 *   - For success: [data, null] where data is the function's return value
 *   - For failure: [null, error] where error is the caught exception
 *
 * @example
 * // Synchronous usage
 * const [data, error] = tryCatch(() => riskyFunction());
 *
 * @example
 * // Asynchronous usage
 * const [data, error] = await tryCatch(() => asyncRiskyFunction());
 */
export function tryCatch<T>(fn: () => T): TryCatchReturn<T> {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return new Promise((resolve) => {
        result
          .then((data) => resolve([data, null]))
          .catch((error) => resolve([null, error]));
      }) as TryCatchReturn<T>;
    }
    return [result, null] as TryCatchReturn<T>;
  } catch (e) {
    return [null, e] as TryCatchReturn<T>;
  }
}

interface TcBuilder<T> {
  mightThrow<E extends Error>(): T & Throws<E>;
}

/**
 * Brands a return value with potential error types for tryCatch inference.
 * Uses a fluent API for declaring errors.
 *
 * @param value - The value to return
 * @returns A builder with mightThrow() to declare error types
 *
 * @example
 * function fetchUser() {
 *   const user = getUser();
 *   return tc(user).mightThrow<APIError | NetworkError>();
 * }
 */
export function tc<T>(value: T): TcBuilder<T> {
  return {
    mightThrow<E extends Error>() {
      return value as T & Throws<E>;
    },
  };
}
