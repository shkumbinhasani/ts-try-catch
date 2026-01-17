import { tryCatch, tc, type Throws } from "./lib/try-catch";

class CustomError extends Error { }

function iMightFail(): string & Throws<CustomError> {
    const random = Math.random();
    if (random > 0.2) {
        return "success"
    } else if (random > 0.5) {
        throw new CustomError()
    }
    throw Error()
}

const [data1, error1] = tryCatch(() => iMightFail());

if (error1) {
    console.log("i Might fail failed", error1.message)
    //                                    ^?
} else {
    console.log("i succeedeed", data1);
    //                            ^?
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function iMightFailAsync(): Promise<string & Throws<CustomError>> {
    await sleep(200)
    const random = Math.random();
    if (random > 0.2) {
        return "success"
    } else if (random > 0.5) {
        throw new CustomError()
    }
    throw Error()
}

const [data2, error2] = await tryCatch(() => iMightFailAsync());

if (error2) {
    console.log("i Might fail async failed", error2.message)
    //                                                ^?
} else {
    console.log("i Might fail async succeeded", data2)
    //                                                  ^?
}


function iMightFailOrNot() {
    return "success"
}

const [data3, error3] = tryCatch(iMightFailOrNot);

if (error3) {
    console.log("i Might fail or not failed", error3.message)
    //                                                  ^?
} else {
    console.log("i Might fail or not succeeded", data3)
    //                                                  ^?
}

interface UserProfile {
    id: string
    name: string
}

class UserModel {
    constructor(public id: string, public name: string) { }

    label() {
        return `${this.name} (${this.id})`
    }
}

function fetchUserProfile(): UserProfile & Throws<CustomError> {
    return { id: "1", name: "Ada" }
}

function fetchUserModel(): UserModel & Throws<CustomError> {
    return new UserModel("1", "Ada")
}

const [profileData, profileError] = tryCatch(fetchUserProfile);

if (profileError) {
    console.log("user profile failed", profileError.message)
} else {
    console.log("user profile", profileData.name)
}

const [modelData, modelError] = tryCatch(fetchUserModel);

if (modelError) {
    console.log("user model failed", modelError.message)
} else {
    console.log("user model", modelData.label())
}

// Using tc() for inferred return types with declared errors
class APIError extends Error { }
class NetworkError extends Error { }

function fetchUserWithTc() {
    const user = { id: "1", name: "Ada", email: "ada@example.com" };
    return tc(user).mightThrow<APIError | NetworkError>();
    // Return type is inferred: { id: string; name: string; email: string } & Throws<APIError | NetworkError>
}

const [tcData, tcError] = tryCatch(fetchUserWithTc);

if (tcError) {
    console.log("tc test failed", tcError.message)
    //                             ^?
} else {
    console.log("tc test succeeded", tcData.email)
    //                                ^?
}
