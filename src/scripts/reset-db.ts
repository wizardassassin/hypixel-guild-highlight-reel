import db from "../db/db.js";
import { blobStorage, guild, player } from "../db/schema.js";

await db.transaction(async (tx) => {
    await tx.delete(blobStorage);
    await tx.delete(player);
    await tx.delete(guild);
});
