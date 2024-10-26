import { initCron } from "./query-store.js";

initCron(async (cronType, cronPromise) => {
    console.log(cronType);
    console.time("Elapsed");
    console.log(await cronPromise);
    console.timeEnd("Elapsed");
});
