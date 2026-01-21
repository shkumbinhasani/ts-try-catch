---
"@shkumbinhsn/try-catch-eslint": minor
---

Add autofix suggestions and new require-throws-declaration rule

- Add `require-throws-declaration` rule that enforces `Throws<E>` declarations for functions with throw statements
- Detect mismatched error types (e.g., throws `ValidationError` but declares `Throws<NetworkError>`)
- Add autofix suggestions to `require-throws-declaration`:
  - Wrap return value with `tc().mightThrow<E>()`
  - Add `Throws<E>` to function return type
  - Add missing error to existing `Throws<>` union type
- Add autofix suggestion to `require-try-catch`:
  - Wrap call in `tryCatch(() => ...)`
- Upgrade to ESLint 9 flat config and typescript-eslint v8
