const errorSymbol = Symbol();
type ErrorSymbol = typeof errorSymbol;

export type Throws<T extends Error> = {
  [errorSymbol]?: T
};

type ExtractErrors<T> = T extends Throws<infer E> ? E : never;

type DataError<T> = [T, null] | [null, Error | ExtractErrors<T>];
type TryCatchReturn<T> = T extends Promise<infer R> ? Promise<DataError<R>> : DataError<T>;

export declare function tryCatch<T>(fn: () => T): TryCatchReturn<T>;