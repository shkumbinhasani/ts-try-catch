const errorSymbol = Symbol();
type ErrorSymbol = typeof errorSymbol;

export type Throws<T extends Error> = {
  [errorSymbol]?: T
};

type ExtractErrors<T> = T extends Throws<infer E> ? E : never;

type Simplify<T> = T extends any ? { [K in keyof T]: T[K] } : never;

type ExtractData<T> =
    T extends string ? string :
        T extends number ? number :
            T extends boolean ? boolean :
                T extends symbol ? symbol :
                    T extends bigint ? bigint :
                        T extends null ? null :
                            T extends undefined ? undefined :
                                T extends Function ? T :
                                    Simplify<Omit<T, ErrorSymbol>>;

type DataError<T> = [ExtractData<T>, null] | [null, Error | ExtractErrors<T>];
type TryCatchReturn<T> = T extends Promise<infer R> ? Promise<DataError<R>> : DataError<T>;

export declare function tryCatch<T>(fn: () => T): TryCatchReturn<T>;