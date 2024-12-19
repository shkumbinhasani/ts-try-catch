# Type-Safe Try-Catch Pattern for TypeScript

This repository demonstrates an experimental approach to handling try-catch blocks in TypeScript with enhanced type safety and flexibility. This pattern allows developers to explicitly define the types of errors that can be thrown while maintaining compatibility with traditional try-catch usage.

## Key Features

1. **Full TypeScript Flexibility**: 
   - Use the `Throws` utility to define the types of errors a function might throw.
   - If type definitions are not needed, the function works like a traditional try-catch and returns a tuple `[data, error]`.

2. **Explicit Error Types**:
   - For functions throwing multiple errors (e.g., `CustomError`, `Error`), use `Throws` to explicitly declare them.

3. **Ease of Use**:
   - Handle returned tuples with an `if` statement to separate success from failure cases.

## Limitations

- **Duplicate Definitions**: 
  - Errors need to be defined twice: once for throwing them and once in the return type. This is a design choice to ensure type safety, but it does not affect runtime behavior.

---

## Example Code

### Defining a Function with Error Handling

```typescript
import { tryCatch, type Throws } from "./lib/try-catch";

class CustomError extends Error {}

function iMightFail(): string & Throws<CustomError> {
  const random = Math.random();
  if (random > 0.2) {
    return "success";
  } else if (random > 0.5) {
    throw new CustomError();
  }
  throw new Error();
}

const [data, error] = tryCatch(() => iMightFail());

if (error1) {
  console.log("i Might fail failed", error.message);
  //                                  ^? Error | CustomError
} else {
  console.log("i succeeded", data);
  //                            ^? string
}

```

### Async Functions with Errors

```typescript
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function iMightFailAsync(): Promise<string & Throws<CustomError>> {
  await sleep(200);
  const random = Math.random();
  if (random > 0.2) {
    return "success";
  } else if (random > 0.5) {
    throw new CustomError();
  }
  throw new Error();
}

const [data, error] = await tryCatch(() => iMightFailAsync());

if (error2) {
  console.log("i Might fail async failed", error.message);
  //                                          ^? Error | CustomError
} else {
  console.log("i Might fail async succeeded", data);
    //                                         ^? string
}
```

### With normal typescript inference

```typescript
function iMightFailOrNot() {
    return "success"
}

const [data3, error3] = tryCatch(iMightFailOrNot);

if (error3) {
    console.log("i Might fail or not failed", error3.message)
    //                                          ^? Error
} else {
    console.log("i Might fail or not succeeded", data3)
    //                                            ^? string
}
```
