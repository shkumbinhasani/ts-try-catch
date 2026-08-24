# @shkumbinhsn/try-catch-oxlint

[Oxlint](https://oxc.rs) plugin that enforces the [`@shkumbinhsn/try-catch`](../try-catch) error-handling pattern: declare the errors a function throws, and handle them through `tryCatch()`.

It is the oxlint counterpart of [`@shkumbinhsn/try-catch-eslint`](../try-catch-eslint) — same three rules, same messages, same suggestions, running on oxlint's Rust-based linter.

## Installation

```bash
npm install -D @shkumbinhsn/try-catch-oxlint oxlint
```

## Setup

Register the plugin in `.oxlintrc.json` and enable the rules:

```json
{
  "jsPlugins": ["@shkumbinhsn/try-catch-oxlint"],
  "rules": {
    "try-catch/require-throws-declaration": "error",
    "try-catch/require-try-catch": "warn",
    "try-catch/no-unhandled-throws": "error"
  }
}
```

The rule prefix comes from the plugin's name, `try-catch`. To use a different prefix, register the plugin with an alias:

```json
{
  "jsPlugins": [{ "name": "tc", "specifier": "@shkumbinhsn/try-catch-oxlint" }],
  "rules": { "tc/require-try-catch": "warn" }
}
```

Run it with `npx oxlint`, and add `--fix-suggestions` to apply the suggested edits.

## Rules

### `require-throws-declaration`

A function that throws must say so, either in its return type or through `tc(value).mightThrow<E>()`.

```typescript
// ✗ throws without declaring it
function fetchUser(id: string) {
  if (!id) throw new ValidationError("id required");
  return db.users.get(id);
}

// ✓ declared in the return type
function fetchUser(id: string): User & Throws<ValidationError> {
  if (!id) throw new ValidationError("id required");
  return db.users.get(id);
}

// ✓ declared on the returned value
function getConfig() {
  if (!exists) throw new ConfigError("missing");
  return tc(config).mightThrow<ConfigError>();
}
```

The rule also reports a throw whose error type is missing from an existing declaration, and suggests adding it. A throw caught by an enclosing `try`/`catch` is ignored, since the error never leaves the function.

Suggestions: wrap the returned value with `tc().mightThrow<E>()`, or add `Throws<E>` to the return type (`Promise<T>` becomes `Promise<T & Throws<E>>`, so the declaration survives `await`).

### `require-try-catch`

A call to a function that declares thrown errors belongs inside `tryCatch()`.

```typescript
function fetchUser(id: string): User & Throws<NetworkError> { /* ... */ }

// ✗ the declared error is ignored
const user = fetchUser("1");

// ✓
const [user, error] = tryCatch(() => fetchUser("1"));
```

Suggestion: wrap the call in `tryCatch(() => ...)`.

### `no-unhandled-throws`

The data half of a `tryCatch()` tuple may only be read once the error half has been checked.

```typescript
const [user, error] = tryCatch(() => fetchUser("1"));

// ✗ user may be undefined here
console.log(user.name);

// ✓ checked first
if (error) return;
console.log(user.name);
```

Both branch checks (`if (error) { … } else { … }`, `if (!error) { … }`, `error === null`) and early exits (`return`, `throw`, `break`, `continue`) count as handling the error.

## Scope: no type information

Oxlint JS plugins run without a TypeScript type checker, which limits two rules compared with the ESLint plugin:

- **`require-throws-declaration`** reads the declaration written at the function itself. A `Throws<E>` reaching the function through a type alias, an interface, or an inherited signature is not seen.
- **`require-try-catch`** only knows about functions declared in the same file. A call to an imported function is never reported, because nothing in the file says whether it throws.

`no-unhandled-throws` is purely syntactic and behaves identically in both plugins.

If you need full type-aware checking, use [`@shkumbinhsn/try-catch-eslint`](../try-catch-eslint), which runs on `typescript-eslint` and its type checker. The two can also run side by side: oxlint for fast feedback, ESLint for the type-aware pass.

## Using the plugin with ESLint

The rules use oxlint's `createOnce` API and the plugin is wrapped with `eslintCompatPlugin()`, so it also loads in ESLint as a type-free alternative:

```javascript
// eslint.config.js
import tryCatchOxlint from "@shkumbinhsn/try-catch-oxlint";

export default [
  {
    plugins: { "try-catch": tryCatchOxlint },
    rules: { "try-catch/no-unhandled-throws": "error" },
  },
];
```

## License

MIT
