![cowboy trying to catch a horse](https://i.imgur.com/TzMOUUL.jpeg)

# Type-Safe Try-Catch Pattern for TypeScript

[![npm version](https://img.shields.io/npm/v/@shkumbinhsn/try-catch.svg)](https://www.npmjs.com/package/@shkumbinhsn/try-catch)
[![npm downloads](https://img.shields.io/npm/dm/@shkumbinhsn/try-catch.svg)](https://www.npmjs.com/package/@shkumbinhsn/try-catch)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight TypeScript utility that provides type-safe error handling through a functional approach. This library allows you to explicitly define error types while maintaining full TypeScript inference and zero runtime overhead.

## Packages

This monorepo contains two packages:

| Package | Description | Version |
|---------|-------------|---------|
| [`@shkumbinhsn/try-catch`](./packages/try-catch) | Core library with `tryCatch()` and `Throws<E>` types | [![npm](https://img.shields.io/npm/v/@shkumbinhsn/try-catch.svg)](https://www.npmjs.com/package/@shkumbinhsn/try-catch) |
| [`@shkumbinhsn/try-catch-eslint`](./packages/try-catch-eslint) | ESLint plugin to enforce type-safe error handling | [![npm](https://img.shields.io/npm/v/@shkumbinhsn/try-catch-eslint.svg)](https://www.npmjs.com/package/@shkumbinhsn/try-catch-eslint) |

## Quick Start

### Installation

```bash
# Core library
npm install @shkumbinhsn/try-catch

# ESLint plugin (optional but recommended)
npm install -D @shkumbinhsn/try-catch-eslint
```

### Basic Usage

```typescript
import { tryCatch, tc, type Throws } from "@shkumbinhsn/try-catch";

// Define custom error types
class ValidationError extends Error {
  name = "ValidationError" as const;
}
class NetworkError extends Error {
  name = "NetworkError" as const;
}

// Declare what errors a function can throw
function fetchUser(id: string): Promise<User> & Throws<ValidationError | NetworkError> {
  if (!id) throw new ValidationError("ID required");
  return fetch(`/api/users/${id}`).then(r => {
    if (!r.ok) throw new NetworkError("Request failed");
    return r.json();
  });
}

// Use tryCatch for type-safe error handling
const [user, error] = await tryCatch(() => fetchUser("123"));

if (error) {
  // TypeScript knows: error is Error | ValidationError | NetworkError
  console.error("Failed:", error.message);
} else {
  // TypeScript knows: user is User
  console.log("User:", user.name);
}
```

### Using `tc()` for Inferred Return Types

When you want TypeScript to infer your return type but still declare possible errors:

```typescript
function getConfig() {
  const config = loadConfigFromDisk();
  return tc(config).mightThrow<ConfigError | FileNotFoundError>();
}
```

## Key Features

- **Type Safety**: Explicitly declare what errors your functions can throw
- **Zero Runtime Overhead**: Types are compile-time only using TypeScript's structural typing
- **Async/Sync Support**: Works seamlessly with both synchronous and asynchronous functions
- **Lightweight**: Minimal footprint with no dependencies
- **Smart Inference**: Falls back to standard TypeScript inference when no error types are specified
- **Tuple-based**: Returns `[data, error]` tuples for explicit error handling
- **ESLint Plugin**: Enforce best practices with automated linting rules

## ESLint Plugin

The ESLint plugin provides three rules to enforce type-safe error handling:

```javascript
// eslint.config.js
import tryCatchPlugin from "@shkumbinhsn/try-catch-eslint";

export default [
  {
    plugins: {
      "@shkumbinhsn/try-catch-eslint": tryCatchPlugin,
    },
    rules: {
      // Require Throws<E> declaration on functions with throw statements
      "@shkumbinhsn/try-catch-eslint/require-throws-declaration": "error",
      
      // Warn when calling Throws<> functions without tryCatch()
      "@shkumbinhsn/try-catch-eslint/require-try-catch": "warn",
      
      // Error when using tryCatch() data without checking error first
      "@shkumbinhsn/try-catch-eslint/no-unhandled-throws": "error",
    },
  },
];
```

See the [ESLint plugin documentation](./packages/try-catch-eslint/README.md) for more details.

## Why Use This Pattern?

Traditional try-catch blocks in TypeScript don't provide type information about what errors might be thrown. This library solves that by:

1. **Making error types explicit** in function signatures
2. **Forcing explicit error handling** through tuple destructuring
3. **Providing better IntelliSense** and type checking
4. **Maintaining compatibility** with existing code

## Documentation

- [Core Library Documentation](./packages/try-catch/README.md)
- [ESLint Plugin Documentation](./packages/try-catch-eslint/README.md)

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

### Development

```bash
# Clone the repo
git clone https://github.com/shkumbinhasani/ts-try-catch.git
cd ts-try-catch

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test
```

## License

MIT
