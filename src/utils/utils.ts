export const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const MAX_DEPTH = 7;

export async function simpleRetryer<T>(
    func: () => Promise<T>,
    depth = 0,
    delay = [1000, 5000, 30000, 60000, 300000]
) {
    try {
        return await func();
    } catch (error) {
        if (depth >= MAX_DEPTH) throw error;
        console.error(error);
        console.error(`Retrying in ${delay[0] / 1000} seconds`);
        await sleep(delay[0]);
        return await simpleRetryer(
            func,
            depth + 1,
            delay.length > 1 ? delay.slice(1) : delay
        );
    }
}
