import cron from "node-cron";
import { updateGuilds } from "./db-update.js";
import { retryer } from "./utils.js";

cron.schedule("30 0 0 * * *", () => retryer(updateGuilds), {
    timezone: "America/New_York",
});
