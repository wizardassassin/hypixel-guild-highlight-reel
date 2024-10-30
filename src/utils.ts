export const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function simpleRetryer<T>(
    func: () => Promise<T>,
    waitTime = 5000,
    depth = 0
) {
    try {
        return await func();
    } catch (error) {
        if (depth >= 5) throw error;
        console.error(error);
        console.error(`Retrying in ${waitTime / 1000} seconds`);
        await sleep(waitTime);
        return await simpleRetryer(func, waitTime, depth + 1);
    }
}
