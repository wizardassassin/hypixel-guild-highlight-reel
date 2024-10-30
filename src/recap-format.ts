import {
    AttachmentBuilder,
    BaseMessageOptions,
    EmbedBuilder,
    Message,
} from "discord.js";
import { diffPlayerStats, queryGuildData } from "./db-query.js";
import { getAvatar } from "./skin-fetcher.js";
import { DateTime } from "luxon";

type statsEmbedDataType = {
    username: string;
    uuid: string;
    prefix: string;
    diff: ReturnType<typeof diffPlayerStats>;
};

const numberFormat2 = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: false,
});
export async function createStatsEmbed(data: statsEmbedDataType) {
    const entries = data.diff.map(({ name, value }) => ({
        name: name,
        value: numberFormat2.format(value),
    }));

    const message: BaseMessageOptions = {
        embeds:
            entries.length < 16
                ? [
                      new EmbedBuilder()
                          .setTitle(data.username)
                          .addFields(...entries)
                          .setThumbnail("attachment://avatar.png"),
                  ]
                : [
                      new EmbedBuilder()
                          .setTitle(data.username)
                          .addFields(...entries.slice(0, entries.length / 2))
                          .setThumbnail("attachment://avatar.png"),
                      new EmbedBuilder().addFields(
                          ...entries.slice(entries.length / 2)
                      ),
                  ],
        files: [
            new AttachmentBuilder(await getAvatar(data.uuid, 128, true), {
                name: "avatar.png",
            }),
        ],
    };
    return message;
}

export async function createGuildRecap(
    guildId: string,
    dateYesterday: DateTime<true> | DateTime<false>,
    dateToday: DateTime<true> | DateTime<false>,
    recapName: string,
    sendMessage: (content: string) => Promise<Message<boolean>>
) {
    const dYest = dateYesterday.toFormat("MM/dd/yy");
    const dToday = dateToday.toFormat("MM/dd/yy");
    const data = await queryGuildData(
        guildId,
        dateYesterday.toJSDate(),
        dateToday.toJSDate()
    );
    if (data.GuildStats.length !== 2) {
        await sendMessage(
            `No data could be found in the range ${dYest} - ${dToday}`
        );
        return;
    }
    const guildData = data.GuildStats[1].members
        .filter(
            (x) =>
                data.GuildStats[0].members.findIndex(
                    (x2) => x2.playerId === x.playerId
                ) !== -1
        )
        .map((x) => ({
            username: x.player.username,
            uuid: x.player.uuid,
            prefix: x.player.prefix,
            diff: diffPlayerStats(
                data.GuildStats[0].members.find(
                    (x2) => x2.playerId === x.playerId
                ),
                x
            ),
        }))
        .filter((x) => x.diff.length !== 0)
        .sort(
            (a, b) =>
                (b.diff.find((x) => x.name === "Guild Experience")?.value ??
                    0) -
                (a.diff.find((x) => x.name === "Guild Experience")?.value ?? 0)
        );
    const totalExp =
        data.GuildStats[1].experience - data.GuildStats[0].experience;
    const totalKills = guildData
        .map((x) =>
            x.diff
                .filter((x2) => x2.name.includes("Kills"))
                .reduce((a, b) => a + b.value, 0)
        )
        .reduce((a, b) => a + b, 0);
    const totalWins = guildData
        .map((x) =>
            x.diff
                .filter((x2) => x2.name.includes("Wins"))
                .reduce((a, b) => a + b.value, 0)
        )
        .reduce((a, b) => a + b, 0);
    const numberFormat1 = new Intl.NumberFormat("en-US", {});
    let content = `# __${recapName}__\n`;
    content += `## __Overall Stats__\n`;
    content += `    ⫸ **${totalExp}** Guild Experience Gained\n\n`;
    content += `    ⫸ **${totalWins}** Total Wins\n\n`;
    content += `    ⫸ **${totalKills}** Total Kills\n`;
    content += `## __Top Guild Experience__\n`;
    for (const { i, username, prefix, diff } of guildData
        .slice(0, 5)
        .map((x, i) => ({ i: i + 1, ...x }))) {
        const exp = diff.find((x) => x.name === "Guild Experience")?.value ?? 0;
        const expFormat = numberFormat1.format(exp);
        const prefix2 = prefix ? prefix + " " : "";
        content += `${i}. **${prefix2}${username}** ${expFormat} Guild Experience\n`;
    }
    content += `-# ${dYest} - ${dToday}\n`;

    const reply = await sendMessage(content);
    const thread = await reply.startThread({
        name: recapName,
    });
    for (const playerData of guildData) {
        await thread.send(await createStatsEmbed(playerData));
    }
}
