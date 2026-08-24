import { noUnhandledThrows } from "../src/rules/no-unhandled-throws.js";
import { runRuleTests } from "./rule-tester.js";

await runRuleTests("no-unhandled-throws", noUnhandledThrows, {
  valid: [
    // Data read in the else branch of an error check.
    `const [user, error] = tryCatch(() => fetchUser("1"));
    if (error) {
      console.error(error);
    } else {
      console.log(user);
    }`,
    // Data read after an early return.
    `const [user, error] = await tryCatch(() => fetchUser("1"));
    if (error) return null;
    console.log(user);`,
    // Data read after an early throw.
    `function load() {
      const [user, error] = tryCatch(() => fetchUser("1"));
      if (error) {
        throw error;
      }
      return user;
    }`,
    // Negated check.
    `const [user, error] = tryCatch(() => fetchUser("1"));
    if (!error) {
      console.log(user);
    }`,
    // Null comparison.
    `const [user, error] = tryCatch(() => fetchUser("1"));
    if (error !== null) {
      handle(error);
    } else {
      console.log(user);
    }`,
    // A same-named property of an unrelated object is not the tuple variable.
    `const [user, error] = tryCatch(() => fetchUser("1"));
    if (error) return;
    const payload = { user: other.user };`,
    // Not a tryCatch() result at all.
    `const [user, error] = somethingElse();
    console.log(user);`,
  ],
  invalid: [
    {
      name: "data read without any error check",
      code: `const [user, error] = tryCatch(() => fetchUser("1"));
console.log(user);`,
      errors: [
        {
          messageId: "noUnhandledThrows",
          data: { name: "user", errorName: "error" },
        },
      ],
    },
    {
      name: "data read on the error branch",
      code: `const [user, error] = tryCatch(() => fetchUser("1"));
if (error) {
  console.log(user);
}`,
      errors: [{ messageId: "noUnhandledThrows" }],
    },
    {
      name: "awaited tryCatch() with no error check",
      code: `const [user, error] = await tryCatch(() => fetchUser("1"));
render(user);`,
      errors: [{ messageId: "noUnhandledThrows" }],
    },
    {
      name: "error checked without leaving the block",
      code: `const [user, error] = tryCatch(() => fetchUser("1"));
if (error) {
  console.error(error);
}
console.log(user);`,
      errors: [{ messageId: "noUnhandledThrows" }],
    },
    {
      name: "every unchecked read is reported",
      code: `const [user, error] = tryCatch(() => fetchUser("1"));
console.log(user);
render(user);`,
      errors: [{ messageId: "noUnhandledThrows" }, { messageId: "noUnhandledThrows" }],
    },
  ],
});
