import {
    AttachmentBuilder,
    BaseMessageOptions,
    EmbedBuilder,
    escapeMarkdown,
    Message,
} from "discord.js";
import {
    diffPlayerStats,
    queryGuildData,
    queryGuildDataLoose,
} from "./db-query.js";
import { DateTime } from "luxon";
import { MojangFetcher } from "./skin-fetcher.js";

type statsEmbedDataType = {
    username: string;
    uuid: string;
    prefix: string;
    diff: ReturnType<typeof diffPlayerStats>;
    startDate: Date;
    stopDate: Date;
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
    const embeds = [];
    const mainEmbed = new EmbedBuilder()
        .setTitle(escapeMarkdown(data.username))
        .setThumbnail("attachment://avatar.png");
    embeds.push(mainEmbed);
    if (entries.length === 0) {
        mainEmbed.setDescription("No measurable stats were found.");
    } else if (entries.length <= 20) {
        mainEmbed.addFields(...entries);
    } else if (entries.length <= 45) {
        mainEmbed.addFields(...entries.slice(0, entries.length / 2));
        embeds.push(
            new EmbedBuilder().addFields(...entries.slice(entries.length / 2))
        );
    } else {
        const chunkSize = entries.length / 3;
        mainEmbed.addFields(...entries.slice(0, chunkSize));
        embeds.push(
            new EmbedBuilder().addFields(
                ...entries.slice(chunkSize, chunkSize * 2)
            )
        );
        embeds.push(
            new EmbedBuilder().addFields(...entries.slice(chunkSize * 2))
        );
    }
    if (data.startDate && data.stopDate) {
        const dStart = DateTime.fromJSDate(data.startDate, {
            zone: "America/New_York",
        }).toFormat("MM/dd/yy");
        const dStop = DateTime.fromJSDate(data.stopDate, {
            zone: "America/New_York",
        }).toFormat("MM/dd/yy");
        embeds.at(-1).setFooter({
            text: `${dStart} - ${dStop}`,
        });
    }
    const message: BaseMessageOptions = {
        embeds: embeds,
        files: [
            new AttachmentBuilder(
                await MojangFetcher.instance.getAvatar(data.uuid, 128),
                {
                    name: "avatar.png",
                }
            ),
        ],
    };
    return message;
}

export async function createGuildHighlight(
    guildId: string,
    dateYesterday: DateTime<true> | DateTime<false>,
    dateToday: DateTime<true> | DateTime<false>,
    highlightName: string,
    sendMessage: (content: string) => Promise<Message<boolean>>
) {
    let data = await queryGuildDataLoose(
        guildId,
        dateYesterday.toJSDate(),
        dateToday.toJSDate()
    );

    if (
        data.guild.GuildStats.length !== 2 ||
        data.guild.GuildStats[0].id === data.guild.GuildStats[1].id
    ) {
        const dYest = dateYesterday.toFormat("MM/dd/yy");
        const dToday = dateToday.toFormat("MM/dd/yy");
        await sendMessage(
            `No data could be found in the range ${dYest} - ${dToday}`
        );
        return;
    }
    dateYesterday = DateTime.fromJSDate(data.guild.GuildStats[0].createdAt, {
        zone: "America/New_York",
    });
    dateToday = DateTime.fromJSDate(data.guild.GuildStats[1].createdAt, {
        zone: "America/New_York",
    });
    const dYest = dateYesterday.toFormat("MM/dd/yy");
    const dToday = dateToday.toFormat("MM/dd/yy");
    const guildData = data.players
        .filter((x) => x.PlayerStats.length >= 2)
        .map((x) => ({
            username: x.username,
            uuid: x.uuid,
            prefix: x.prefix,
            diff: diffPlayerStats(x.PlayerStats[0], x.PlayerStats[1]),
            startDate: x.PlayerStats[0].createdAt,
            stopDate: x.PlayerStats[1].createdAt,
        }))
        .filter((x) => x.diff.length !== 0)
        .sort(
            (a, b) =>
                (b.diff.find((x) => x.name === "Guild Experience")?.value ??
                    0) -
                (a.diff.find((x) => x.name === "Guild Experience")?.value ?? 0)
        );
    const totalExp =
        data.guild.GuildStats[1].experience -
        data.guild.GuildStats[0].experience;
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
    let content = `# __${highlightName}__\n`;
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
        const username2 = escapeMarkdown(username);
        content += `${i}. **${prefix2}${username2}** ${expFormat} Guild Experience\n`;
    }
    content += `-# ${dYest} - ${dToday}\n`;

    const reply = await sendMessage(content);
    const thread = await reply.startThread({
        name: highlightName.replace(/\\/g, ""),
    });
    for (const playerData of guildData) {
        await thread.send(await createStatsEmbed(playerData));
    }
}
