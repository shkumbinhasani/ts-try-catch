# @shkumbinhsn/try-catch

[![npm version](https://img.shields.io/npm/v/@shkumbinhsn/try-catch.svg)](https://www.npmjs.com/package/@shkumbinhsn/try-catch)
[![npm downloads](https://img.shields.io/npm/dm/@shkumbinhsn/try-catch.svg)](https://www.npmjs.com/package/@shkumbinhsn/try-catch)

Type-safe error handling for TypeScript using a functional `[data, error]` tuple pattern.

## Installation

```bash
npm install @shkumbinhsn/try-catch
```

## Features

- **Type Safety**: Explicitly declare what errors your functions can throw
- **Zero Runtime Overhead**: Types are compile-time only
- **Async/Sync Support**: Works with both synchronous and asynchronous functions
- **Lightweight**: No dependencies, minimal footprint
- **Tuple-based**: Returns `[data, error]` for explicit error handling

## Usage

### Basic Example

```typescript
import { tryCatch, type Throws } from "@shkumbinhsn/try-catch";

class CustomError extends Error {
  name = "CustomError" as const;
}

function riskyOperation(): string & Throws<CustomError> {
  if (Math.random() > 0.5) {
    throw new CustomError("Something went wrong");
  }
  return "success";
}

const [data, error] = tryCatch(() => riskyOperation());

if (error) {
  // TypeScript knows: error is Error | CustomError
  console.error("Failed:", error.message);
} else {
  // TypeScript knows: data is string
  console.log("Success:", data);
}
```

### Async Functions

```typescript
import { tryCatch, type Throws } from "@shkumbinhsn/try-catch";

class ValidationError extends Error {}
class NetworkError extends Error {}

async function fetchUser(id: string): Promise<User> & Throws<ValidationError | NetworkError> {
  if (!id) {
    throw new ValidationError("User ID is required");
  }
  
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new NetworkError("Failed to fetch user");
  }
  
  return response.json();
}

// Async usage
const [user, error] = await tryCatch(() => fetchUser("123"));

if (error) {
  if (error instanceof ValidationError) {
    console.error("Validation failed:", error.message);
  } else if (error instanceof NetworkError) {
    console.error("Network failed:", error.message);
  }
} else {
  console.log("User:", user.name);
}
```

### Using `tc()` for Inferred Return Types

When you want TypeScript to infer your return type but still declare possible errors, use the `tc()` helper:

```typescript
import { tryCatch, tc } from "@shkumbinhsn/try-catch";

class APIError extends Error {}
class NetworkError extends Error {}

function fetchUser() {
  const user = { id: "1", name: "Ada", email: "ada@example.com" };
  // Return type is inferred as { id: string; name: string; email: string } & Throws<APIError | NetworkError>
  return tc(user).mightThrow<APIError | NetworkError>();
}

const [data, error] = tryCatch(fetchUser);

if (error) {
  // TypeScript knows: error is Error | APIError | NetworkError
  console.error("Failed:", error.message);
} else {
  // TypeScript knows: data is { id: string; name: string; email: string }
  console.log("User email:", data.email);
}
```

### Without Explicit Error Types

When you don't specify error types, the library falls back to standard TypeScript inference:

```typescript
function regularFunction() {
  return "success";
}

const [data, error] = tryCatch(regularFunction);

if (error) {
  // TypeScript knows: error is Error
  console.error("Failed:", error.message);
} else {
  // TypeScript knows: data is string
  console.log("Success:", data);
}
```

## API Reference

### `tryCatch<T>(fn: () => T): TryCatchReturn<T>`

Executes a function within a try-catch block and returns a result tuple.

**Parameters:**
- `fn`: Function to execute (can be sync or async)

**Returns:**
- `[data, null]` on success
- `[null, error]` on failure

### `Throws<T extends Error>`

Type utility for declaring error types in function signatures.

```typescript
function myFunction(): ReturnType & Throws<MyError> {
  // implementation
}
```

### `tc<T>(value: T): TcBuilder<T>`

Creates a builder for branding return values with error types.

```typescript
function myFunction() {
  const result = computeSomething();
  return tc(result).mightThrow<ErrorA | ErrorB>();
}
```

## Limitations

- **Duplicate Definitions**: Error types must be declared in both the throw statement and return type
- **Runtime Validation**: No runtime enforcement of declared error types
- **Learning Curve**: Requires understanding of TypeScript's structural typing

## ESLint Plugin

For automated enforcement of best practices, use the companion ESLint plugin:

```bash
npm install -D @shkumbinhsn/try-catch-eslint
```

See [@shkumbinhsn/try-catch-eslint](https://www.npmjs.com/package/@shkumbinhsn/try-catch-eslint) for details.

## License

MIT
