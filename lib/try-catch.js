export function tryCatch(fn) {
    try {
        const result = fn();
        if(result instanceof Promise) {
            return new Promise((resolve) => {
                result.then((data) => resolve([data, null])).catch((error) => resolve([null, error]))
            })
        }
        return [result, null];
    } catch (e) {
        return [null, e]
    }
}