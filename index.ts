import { tryCatch, type Throws } from "./lib/try-catch";

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
