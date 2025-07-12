import db from "./db.js";
import { blobStorage } from "./schema.js";

export async function setBlob(name: string, blob: Buffer, date?: Date) {
    await db
        .insert(blobStorage)
        .values({
            name: name,
            blob: blob,
            ...(date && { createdAt: date.getTime() }),
        })
        .onConflictDoUpdate({
            target: blobStorage.id,
            set: {
                blob: blob,
                ...((date && { createdAt: date.getTime() }) || {
                    createdAt: new Date().getTime(),
                }),
            },
        });
}

export async function getBlob(name: string) {
    return await db.query.blobStorage.findFirst({
        where: (blobStorage, { eq }) => eq(blobStorage.name, name),
    });
}
