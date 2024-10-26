import {
    AttachmentBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    InteractionContextType,
    SlashCommandBuilder,
} from "discord.js";
import { DateTime } from "luxon";
import { diffPlayerStats, queryGuildData } from "../db-query.js";
import { getAvatar } from "../skin-fetcher.js";

export const data = new SlashCommandBuilder()
    .setName("recap")
    .setDescription("Gets a recap of the entire guild!")
    .addStringOption((option) =>
        option
            .setName("start")
            .setDescription("Start time (MM/dd/yyyy).")
            .setRequired(true)
    )
    .addStringOption((option) =>
        option
            .setName("end")
            .setDescription("End time (MM/dd/yyyy).")
            .setRequired(true)
    )
    .setContexts(InteractionContextType.Guild);

export async function execute(interaction: ChatInputCommandInteraction) {
    const dateNow = DateTime.now().setZone("America/New_York").startOf("day");
    const date = dateNow.toJSDate();
    const dateYesterday = dateNow.minus({ days: 1 }).toJSDate();
    const data = await queryGuildData(interaction.guildId, dateYesterday, date);
    console.assert(data.GuildStats.length === 2);
    const data2 = data.GuildStats[1].members
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
    const data3 = data.GuildStats[1].experience - data.GuildStats[0].experience;
    const totalKills = data2
        .map((x) =>
            x.diff
                .filter((x2) => x2.name.includes("Kills"))
                .reduce((a, b) => a + b.value, 0)
        )
        .reduce((a, b) => a + b, 0);
    const totalWins = data2
        .map((x) =>
            x.diff
                .filter((x2) => x2.name.includes("Wins"))
                .reduce((a, b) => a + b.value, 0)
        )
        .reduce((a, b) => a + b, 0);
    const dYest = dateNow.minus({ days: 1 }).toFormat("MM/dd/yy");
    const dToday = dateNow.toFormat("MM/dd/yy");
    const numberFormat = new Intl.NumberFormat("en-US", {});
    let content = `# __Weekly Recap!__\n`;
    content += `## __Overall Stats__\n`;
    content += `    ⫸ **${data3}** Guild Experience Gained\n\n`;
    content += `    ⫸ **${totalWins}** Total Wins\n\n`;
    content += `    ⫸ **${totalKills}** Total Kills\n`;
    content += `## __Top Guild Experience__\n`;
    for (const { i, username, prefix, diff } of data2
        .slice(0, 5)
        .map((x, i) => ({ i: i + 1, ...x }))) {
        const exp = diff.find((x) => x.name === "Guild Experience")?.value ?? 0;
        const expFormat = numberFormat.format(exp);
        const prefix2 = prefix ? prefix + " " : "";
        content += `${i}. **${prefix2}${username}** ${expFormat} Guild Experience\n`;
    }
    content += `-# ${dYest} - ${dToday}\n`;

    const reply = await interaction.reply({
        content: content,
        fetchReply: true,
    });
    const thread = await reply.startThread({
        name: "Guild Recap",
    });
    const numberFormat2 = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
        useGrouping: false,
    });
    for (const data1 of data2) {
        const entries = data1.diff.map(({ name, value }) => ({
            name: name,
            value: numberFormat2.format(value),
        }));
        await thread.send({
            embeds:
                entries.length < 16
                    ? [
                          new EmbedBuilder()
                              .setTitle(data1.username)
                              .addFields(...entries)
                              .setThumbnail("attachment://avatar.png"),
                      ]
                    : [
                          new EmbedBuilder()
                              .setTitle(data1.username)
                              .addFields(
                                  ...entries.slice(0, entries.length / 2)
                              )
                              .setThumbnail("attachment://avatar.png"),
                          new EmbedBuilder().addFields(
                              ...entries.slice(entries.length / 2)
                          ),
                      ],
            files: [
                new AttachmentBuilder(await getAvatar(data1.uuid, 128, true), {
                    name: "avatar.png",
                }),
            ],
        });
    }
}
