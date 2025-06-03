# Type-Safe Try-Catch Pattern for TypeScript

A lightweight TypeScript utility that provides type-safe error handling through a functional approach. This library allows you to explicitly define error types while maintaining full TypeScript inference and zero runtime overhead.

## Installation

```bash
npm install @shkumbinhsn/try-catch
```

## Key Features

- **🔒 Type Safety**: Explicitly declare what errors your functions can throw
- **🎯 Zero Runtime Overhead**: Types are compile-time only using TypeScript's structural typing
- **🔄 Async/Sync Support**: Works seamlessly with both synchronous and asynchronous functions
- **📦 Lightweight**: Minimal footprint with no dependencies
- **🧠 Smart Inference**: Falls back to standard TypeScript inference when no error types are specified
- **🛡️ Tuple-based**: Returns `[data, error]` tuples for explicit error handling

## Why Use This Pattern?

Traditional try-catch blocks in TypeScript don't provide type information about what errors might be thrown. This library solves that by:

1. Making error types explicit in function signatures
2. Forcing explicit error handling through tuple destructuring
3. Providing better IntelliSense and type checking
4. Maintaining compatibility with existing code

---

## Example Code

### Defining a Function with Error Handling

```typescript
import { tryCatch, type Throws } from "@shkumbinhsn/try-catch";

class CustomError extends Error {}

function iMightFail(): string & Throws<CustomError> {
  const random = Math.random();
  if (random > 0.2) {
    return "success";
  } else if (random > 0.5) {
    throw new CustomError("Something went wrong");
  }
  throw new Error("Generic error");
}

const [data, error] = tryCatch(() => iMightFail());

if (error) {
  console.log("Operation failed:", error.message);
  // TypeScript knows: error is Error | CustomError
} else {
  console.log("Operation succeeded:", data);
  // TypeScript knows: data is string
}
```

### Async Functions with Errors

```typescript
async function fetchUserData(id: string): Promise<User & Throws<ValidationError | NetworkError>> {
  if (!id) {
    throw new ValidationError("User ID is required");
  }
  
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new NetworkError("Failed to fetch user data");
  }
  
  return response.json();
}

const [userData, error] = await tryCatch(() => fetchUserData("123"));

if (error) {
  if (error instanceof ValidationError) {
    console.log("Validation error:", error.message);
  } else if (error instanceof NetworkError) {
    console.log("Network error:", error.message);
  } else {
    console.log("Unexpected error:", error.message);
  }
} else {
  console.log("User data:", userData);
  // TypeScript knows: userData is User
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
  console.log("Operation failed:", error.message);
  // TypeScript knows: error is Error
} else {
  console.log("Operation succeeded:", data);
  // TypeScript knows: data is string
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

**Usage:**
```typescript
function myFunction(): ReturnType & Throws<MyError> {
  // function implementation
}
```

## Limitations

- **Duplicate Definitions**: Error types must be declared in both the throw statement and return type
- **Runtime Validation**: No runtime enforcement of declared error types
- **Learning Curve**: Requires understanding of TypeScript's structural typing

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT
