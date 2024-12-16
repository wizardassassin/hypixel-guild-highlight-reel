import prisma from "./db.js";

export async function setBlob(name: string, blob: Buffer) {
    await prisma.blobStorage.upsert({
        where: {
            name: name,
        },
        create: {
            name: name,
            blob: blob,
        },
        update: {
            blob: blob,
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
