export const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const retryer = async (
    func: () => any,
    retryTimes = [60, 300, 300, 600, 600]
) => {
    try {
        console.log("Running job");
        console.time("Job");
        await func();
        console.timeEnd("Job");
    } catch (error) {
        console.timeEnd("Job");
        console.error(error);
        if (retryTimes.length > 0) {
            console.error(`Retrying in ${retryTimes[0]} seconds`);
            await sleep(retryTimes[0]);
            await retryer(func, retryTimes.slice(1));
        } else {
            console.error("Failed job");
        }
    }
};
