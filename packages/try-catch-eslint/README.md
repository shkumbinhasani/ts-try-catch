# @shkumbinhsn/try-catch-eslint

[![npm version](https://img.shields.io/npm/v/@shkumbinhsn/try-catch-eslint.svg)](https://www.npmjs.com/package/@shkumbinhsn/try-catch-eslint)
[![npm downloads](https://img.shields.io/npm/dm/@shkumbinhsn/try-catch-eslint.svg)](https://www.npmjs.com/package/@shkumbinhsn/try-catch-eslint)

ESLint plugin to enforce type-safe error handling patterns with [@shkumbinhsn/try-catch](https://www.npmjs.com/package/@shkumbinhsn/try-catch).

## Installation

```bash
npm install -D @shkumbinhsn/try-catch-eslint
```

### Peer Dependencies

This plugin requires the following peer dependencies:

- `eslint` ^8.0.0 || ^9.0.0
- `@typescript-eslint/parser` ^8.0.0
- `typescript` >=4.7.0

## Setup

### ESLint Flat Config (eslint.config.js)

```javascript
import tryCatchPlugin from "@shkumbinhsn/try-catch-eslint";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@shkumbinhsn/try-catch-eslint": tryCatchPlugin,
    },
    rules: {
      "@shkumbinhsn/try-catch-eslint/require-throws-declaration": "error",
      "@shkumbinhsn/try-catch-eslint/require-try-catch": "warn",
      "@shkumbinhsn/try-catch-eslint/no-unhandled-throws": "error",
    },
  },
];
```

### Using Recommended Config

```javascript
import tryCatchPlugin from "@shkumbinhsn/try-catch-eslint";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@shkumbinhsn/try-catch-eslint": tryCatchPlugin,
    },
    rules: {
      ...tryCatchPlugin.configs.recommended.rules,
    },
  },
];
```

## Rules

### `require-throws-declaration`

**Severity:** Error (recommended)

Requires functions with `throw` statements to declare a `Throws<E>` return type.

#### Bad

```typescript
function riskyOperation(): string {
  if (Math.random() > 0.5) {
    throw new CustomError("Failed"); // Error: Function throws but doesn't declare Throws<E>
  }
  return "success";
}
```

#### Good

```typescript
import { type Throws } from "@shkumbinhsn/try-catch";

function riskyOperation(): string & Throws<CustomError> {
  if (Math.random() > 0.5) {
    throw new CustomError("Failed");
  }
  return "success";
}
```

#### Autofix Suggestions

This rule provides suggestions to:
- Add `& Throws<ErrorType>` to the return type
- Wrap return value with `tc(value).mightThrow<ErrorType>()`
- Add missing error types to existing `Throws<>` declaration

---

### `require-try-catch`

**Severity:** Warn (recommended)

Warns when calling functions that return `Throws<E>` without wrapping in `tryCatch()`.

#### Bad

```typescript
import { type Throws } from "@shkumbinhsn/try-catch";

function riskyOperation(): string & Throws<CustomError> {
  // ...
}

const result = riskyOperation(); // Warning: Should wrap in tryCatch()
```

#### Good

```typescript
import { tryCatch, type Throws } from "@shkumbinhsn/try-catch";

function riskyOperation(): string & Throws<CustomError> {
  // ...
}

const [data, error] = tryCatch(() => riskyOperation());
```

#### Autofix Suggestions

This rule provides a suggestion to wrap the call in `tryCatch(() => ...)`.

---

### `no-unhandled-throws`

**Severity:** Error (recommended)

Errors when using the data from `tryCatch()` without first checking for errors.

#### Bad

```typescript
const [data, error] = tryCatch(() => riskyOperation());

console.log(data.value); // Error: Must check error before using data
```

#### Good

```typescript
const [data, error] = tryCatch(() => riskyOperation());

if (error) {
  console.error("Failed:", error.message);
  return;
}

console.log(data.value); // OK: error was checked
```

Also valid:

```typescript
const [data, error] = tryCatch(() => riskyOperation());

if (!error) {
  console.log(data.value); // OK: inside !error block
}
```

## Rule Configuration

All rules can be configured with standard ESLint severity levels:

```javascript
rules: {
  // Turn off
  "@shkumbinhsn/try-catch-eslint/require-throws-declaration": "off",
  
  // Warning
  "@shkumbinhsn/try-catch-eslint/require-try-catch": "warn",
  
  // Error
  "@shkumbinhsn/try-catch-eslint/no-unhandled-throws": "error",
}
```

## How It Works

This plugin uses TypeScript's type information to:

1. **Detect `Throws<E>` types** in function return types
2. **Track `throw` statements** in function bodies
3. **Analyze `tryCatch()` usage** to ensure proper error handling

The plugin requires `@typescript-eslint/parser` with type information enabled (`parserOptions.project`).

## Related

- [@shkumbinhsn/try-catch](https://www.npmjs.com/package/@shkumbinhsn/try-catch) - The core library

## License

MIT
