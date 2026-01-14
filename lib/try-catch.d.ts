const errorSymbol = Symbol();

type ErrorSymbol = typeof errorSymbol;

export type Throws<T extends Error> = {
  [errorSymbol]?: T
};

type ExtractErrors<T> = T extends Throws<infer E> ? E : never;

type StripThrows<T> = T extends infer R & Throws<Error> ? R : T;

type DataError<T> = [StripThrows<T>, null] | [null, Error | ExtractErrors<T>];

type TryCatchReturn<T> = T extends Promise<infer R>
  ? Promise<DataError<R>>
  : DataError<T>;

export declare function tryCatch<T>(fn: () => T): TryCatchReturn<T>;
