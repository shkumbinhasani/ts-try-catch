---
"@shkumbinhsn/try-catch-oxlint": minor
---

Add oxlint plugin with `require-throws-declaration`, `require-try-catch` and `no-unhandled-throws`. The rules mirror the ESLint plugin's messages and suggestions, and run without type information: `require-throws-declaration` reads the declaration written at the function itself, and `require-try-catch` sees functions declared in the same file.
