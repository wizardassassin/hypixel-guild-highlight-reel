import prisma from "./db.js";
import {
    getGuildEndpointData,
    getPlayerEndpointData,
    PlayerEndpointType,
} from "./hypixel-fetcher.js";

export async function createGuild(discordGuildID: string, playerUUID: string) {
    const guildData = await getGuildEndpointData(playerUUID, "PLAYER");
    const guild = await prisma.guild.create({
        data: {
            guildIdDiscord: discordGuildID,
            guildIdHypixel: guildData.id,
            name: guildData.name,
            createdAtHypixel: guildData.created,
        },
    });
    return guild.id;
}

/**
 * Called once a day right after 12AM ET or EST
 *
 */
export async function updateGuilds() {
    const guilds = await prisma.guild.findMany();
    for (const guild of guilds) {
        const guildIdHypixel = guild.guildIdHypixel;
        console.time("Fetch");
        const guildData = await getGuildEndpointData(guildIdHypixel, "GUILD");
        const playerData: [
            PlayerEndpointType,
            (typeof guildData)["members"][number],
            string
        ][] = [];
        for (const player of guildData.members) {
            playerData.push([
                await getPlayerEndpointData(player.uuid),
                player,
                "",
            ]);
        }
        console.timeEnd("Fetch");
        console.time("Database");
        for (const player of playerData) {
            const { id } = await prisma.player.upsert({
                where: {
                    uuid: player[0].uuid,
                },
                create: {
                    uuid: player[0].uuid,
                    username: player[0].username,
                    joined: new Date(player[1].joined),
                },
                update: {
                    username: player[0].username,
                    joined: new Date(player[1].joined),
                },
            });
            player[2] = id;
        }
        await prisma.guild.update({
            where: {
                id: guild.id,
            },
            data: {
                name: guildData.name,
            },
        });
        await prisma.guildStats.create({
            data: {
                guildId: guild.id,
                experience: guildData.exp,
                experienceByGameType: Buffer.from(
                    JSON.stringify(guildData.guildExpByGameType)
                ),
                members: {
                    createMany: {
                        data: playerData.map((x) => ({
                            playerId: x[2],
                            playerStats: Buffer.from(
                                JSON.stringify(x[0].playerStats)
                            ),
                            experience: x[1].expHistory[1][1],
                            questParticipation: x[1].questParticipation,
                        })),
                    },
                },
            },
        });
        console.timeEnd("Database");
    }
}
