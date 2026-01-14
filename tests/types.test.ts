import { tryCatch, type Throws } from "../lib/try-catch";

type Expect<T extends true> = T;

type ShapesMatch<T, U> = [T] extends [U]
  ? [U] extends [T]
    ? true
    : false
  : false;

type TypesMatch<T, U> = ShapesMatch<T, U> extends true
  ? ShapesMatch<keyof T, keyof U> extends true
    ? true
    : false
  : false;

type ExtractData<T> = T extends [infer D, null] ? D : never;

type ExtractError<T> = T extends [null, infer E] ? E : never;


class CustomError extends Error {}
class OtherError extends Error {}
class UserError extends Error {}
class WidgetError extends Error {}

interface UserProfile {
  id: string;
  name: string;
}

class Widget {
  constructor(public id: string) {}
  getLabel() {
    return this.id;
  }
}

declare function mightFail(): string & Throws<CustomError>;
declare function mightFailAsync(): Promise<number & Throws<OtherError>>;
declare function ok(): boolean;
declare function loadUser(): UserProfile & Throws<UserError>;
declare function loadWidget(): Widget & Throws<WidgetError>;

const syncResult = tryCatch(() => mightFail());
const asyncResult = tryCatch(() => mightFailAsync());
const okResult = tryCatch(ok);
const userResult = tryCatch(() => loadUser());
const widgetResult = tryCatch(() => loadWidget());

type Tests = [
  Expect<TypesMatch<ExtractData<typeof syncResult>, string>>,
  Expect<TypesMatch<ExtractError<typeof syncResult>, Error | CustomError>>,
  Expect<TypesMatch<ExtractData<Awaited<typeof asyncResult>>, number>>,
  Expect<TypesMatch<ExtractError<Awaited<typeof asyncResult>>, Error | OtherError>>,
  Expect<TypesMatch<ExtractData<typeof okResult>, boolean>>,
  Expect<TypesMatch<ExtractError<typeof okResult>, Error>>,
  Expect<TypesMatch<ExtractData<typeof userResult>, UserProfile>>,
  Expect<TypesMatch<ExtractError<typeof userResult>, Error | UserError>>,
  Expect<TypesMatch<ExtractData<typeof widgetResult>, Widget>>,
  Expect<TypesMatch<ExtractError<typeof widgetResult>, Error | WidgetError>>,
];
