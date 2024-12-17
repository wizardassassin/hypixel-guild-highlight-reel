import prisma from "./db.js";

await prisma.$transaction([
    prisma.blobStorage.deleteMany(),
    prisma.player.deleteMany(),
    prisma.guild.deleteMany(),
]);
