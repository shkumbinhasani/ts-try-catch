/**
 * Executes a function within a try-catch block and returns a tuple [data, error].
 * 
 * @param {Function} fn - The function to execute. Can be synchronous or return a Promise.
 * @returns {Array|Promise<Array>} A tuple where:
 *   - For success: [data, null] where data is the function's return value
 *   - For failure: [null, error] where error is the caught exception
 * 
 * @example
 * // Synchronous usage
 * const [data, error] = tryCatch(() => riskyFunction());
 * 
 * @example  
 * // Asynchronous usage
 * const [data, error] = await tryCatch(() => asyncRiskyFunction());
 */
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