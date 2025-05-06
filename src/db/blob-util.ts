import prisma from "./db.js";

export async function setBlob(name: string, blob: Buffer, date?: Date) {
    await prisma.blobStorage.upsert({
        where: {
            name: name,
        },
        create: {
            name: name,
            blob: blob,
            ...(date && { createdAt: date }),
        },
        update: {
            blob: blob,
            ...((date && { createdAt: date }) || { createdAt: new Date() }),
        },
    });
}

export async function getBlob(name: string) {
    return await prisma.blobStorage.findUnique({
        where: {
            name: name,
        },
    });
}
