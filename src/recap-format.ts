import {
    APISectionComponent,
    AttachmentBuilder,
    BaseMessageOptions,
    Client,
    Colors,
    ComponentBuilder,
    ComponentType,
    ContainerBuilder,
    EmbedBuilder,
    escapeMarkdown,
    Message,
    MessageCreateOptions,
    MessageFlags,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
} from "discord.js";
import {
    diffPlayerStats,
    queryGuildData,
    queryGuildDataLoose,
} from "./db/db-query.js";
import { DateTime } from "luxon";
import { MojangFetcher } from "./query/skin-fetcher.js";
import assert from "assert/strict";
import { getSplashTextRandomizer } from "./utils/splash-text.js";

type statsEmbedDataType = {
    username: string;
    uuid: string;
    prefix: string;
    color: number;
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
    assert.ok(data.diff.length > 0);
    const createMarkdownList = (obj: (typeof data.diff)[number]) =>
        obj.stats
            .filter((x) => x.value !== 0)
            .map((x) => `### ${x.name}\n${numberFormat2.format(x.value)}`)
            .join("\n");
    const mainSection = new SectionBuilder({
        components: [
            {
                content:
                    `## ${escapeMarkdown(data.username)}\n${" ".repeat(36)}\n` +
                    createMarkdownList(data.diff[0]),
                type: ComponentType.TextDisplay,
            },
        ],
        accessory: {
            media: {
                url: "attachment://avatar.png",
            },
            type: ComponentType.Thumbnail,
        },
    });

    const color = data.color;

    const messages: BaseMessageOptions[] = [
        {
            components: [
                new ContainerBuilder({
                    accent_color: color,
                }),
            ],
            files: [
                new AttachmentBuilder(
                    await MojangFetcher.instance.getAvatar(data.uuid, 128),
                    {
                        name: "avatar.png",
                    }
                ),
            ],
        },
    ];

    (
        messages.at(-1).components.at(-1) as ContainerBuilder
    ).addSectionComponents(mainSection);

    let maxComponentsCounter = 1;
    for (const obj of data.diff.slice(1)) {
        if (obj.stats.every((x) => x.value == 0)) continue;
        if (maxComponentsCounter >= 9) {
            maxComponentsCounter = 0;
            messages.push({
                components: [
                    new ContainerBuilder({
                        accent_color: color,
                    }),
                ],
                files: [],
            });
        } else {
            (
                messages.at(-1).components.at(-1) as ContainerBuilder
            ).addSeparatorComponents(
                new SeparatorBuilder({
                    spacing: SeparatorSpacingSize.Large,
                    divider: true,
                })
            );
        }
        const filename = obj.thumbnail.split("/").at(-1);
        const prefix = maxComponentsCounter === 0 ? `${" ".repeat(36)}\n` : "";
        (
            messages.at(-1).components.at(-1) as ContainerBuilder
        ).addSectionComponents(
            new SectionBuilder({
                components: [
                    {
                        content:
                            prefix +
                            `### ${obj.name}\n` +
                            createMarkdownList(obj),
                        type: ComponentType.TextDisplay,
                    },
                ],
                accessory: {
                    media: {
                        url: "attachment://" + filename,
                    },
                    type: ComponentType.Thumbnail,
                },
            })
        );
        (messages.at(-1).files as AttachmentBuilder[]).push(
            new AttachmentBuilder(obj.thumbnail, { name: filename })
        );
        maxComponentsCounter++;
    }
    if (data.startDate && data.stopDate) {
        const dStart = DateTime.fromJSDate(data.startDate, {
            zone: "America/New_York",
        }).toFormat("MM/dd/yy");
        const dStop = DateTime.fromJSDate(data.stopDate, {
            zone: "America/New_York",
        }).toFormat("MM/dd/yy");
        (
            messages.at(-1).components.at(-1) as ContainerBuilder
        ).addSeparatorComponents(
            new SeparatorBuilder({
                spacing: SeparatorSpacingSize.Large,
                divider: true,
            })
        );
        (
            messages.at(-1).components.at(-1) as ContainerBuilder
        ).addTextDisplayComponents(
            new TextDisplayBuilder({
                content: `-# ${dStart} - ${dStop}`,
            })
        );
    }
    return messages;
}

export async function createGuildHighlight(
    guildId: string,
    dateYesterday: DateTime<true> | DateTime<false>,
    dateToday: DateTime<true> | DateTime<false>,
    highlightName: string,
    sendMessage: (message: BaseMessageOptions) => Promise<Message<boolean>>,
    iconURL: string
) {
    let data = await queryGuildDataLoose(
        guildId,
        dateYesterday.toJSDate(),
        dateToday.toJSDate()
    );

    if (
        data.guild.guildStats.length !== 2 ||
        data.guild.guildStats[0].id === data.guild.guildStats[1].id
    ) {
        const dYest = dateYesterday.toFormat("MM/dd/yy");
        const dToday = dateToday.toFormat("MM/dd/yy");
        await sendMessage({
            content: `No data could be found in the range ${dYest} - ${dToday}`,
        });
        return;
    }
    dateYesterday = DateTime.fromJSDate(
        new Date(data.guild.guildStats[0].createdAt),
        {
            zone: "America/New_York",
        }
    );
    dateToday = DateTime.fromJSDate(
        new Date(data.guild.guildStats[1].createdAt),
        {
            zone: "America/New_York",
        }
    );
    const dYest = dateYesterday.toFormat("MM/dd/yy");
    const dToday = dateToday.toFormat("MM/dd/yy");
    const guildData = data.players
        .filter((x) => x.playerStats.length >= 2)
        .map((x) => ({
            username: x.username,
            uuid: x.uuid,
            prefix: x.prefix,
            color: x.color,
            diff: diffPlayerStats(x.playerStats[0], x.playerStats[1]),
            startDate: new Date(x.playerStats[0].createdAt),
            stopDate: new Date(x.playerStats[1].createdAt),
        }))
        .filter((x) =>
            x.diff
                .map((x) => x.stats)
                .flat()
                .some((x2) => x2.value !== 0)
        )
        .sort(
            (a, b) =>
                (b.diff
                    .map((x) => x.stats)
                    .flat()
                    .find((x) => x.name === "Guild Experience")?.value ?? 0) -
                (a.diff
                    .map((x) => x.stats)
                    .flat()
                    .find((x) => x.name === "Guild Experience")?.value ?? 0)
        );
    const totalExp =
        data.guild.guildStats[1].experience -
        data.guild.guildStats[0].experience;
    const totalKills = guildData
        .map((x) =>
            x.diff
                .map((x) => x.stats)
                .flat()
                .filter((x2) => x2.name.includes("Kills"))
                .reduce((a, b) => a + b.value, 0)
        )
        .reduce((a, b) => a + b, 0);
    const totalWins = guildData
        .map((x) =>
            x.diff
                .map((x) => x.stats)
                .flat()
                .filter((x2) => x2.name.includes("Wins"))
                .reduce((a, b) => a + b.value, 0)
        )
        .reduce((a, b) => a + b, 0);
    const numberFormat1 = new Intl.NumberFormat("en-US", {});
    const randomizer = getSplashTextRandomizer();
    let content = `# __${highlightName}__\n`;
    content += randomizer
        .pick()
        .split("\n")
        .map((x) => `-# ${x}\n`)
        .join("");
    content += `## __Overall Stats__\n`;
    content += `    ⫸ **${totalExp}** Guild Experience Gained\n\n`;
    content += `    ⫸ **${totalWins}** Total Wins\n\n`;
    content += `    ⫸ **${totalKills}** Total Kills\n`;
    content += `## __Top Guild Experience__\n`;
    for (const { i, username, prefix, diff } of guildData
        .slice(0, 5)
        .map((x, i) => ({ i: i + 1, ...x }))) {
        const exp =
            diff
                .map((x) => x.stats)
                .flat()
                .find((x) => x.name === "Guild Experience")?.value ?? 0;
        const expFormat = numberFormat1.format(exp);
        const prefix2 = prefix ? prefix + " " : "";
        const username2 = escapeMarkdown(username);
        content += `${i}. **${prefix2}${username2}** ${expFormat} Guild Experience\n`;
    }
    content += `-# ${dYest} - ${dToday}\n`;

    const reply = await sendMessage({
        components: [
            new SectionBuilder({
                components: [
                    {
                        content: content,
                        type: ComponentType.TextDisplay,
                    },
                ],
                accessory: {
                    media: {
                        url: iconURL,
                    },
                    type: ComponentType.Thumbnail,
                },
            }),
        ],
    });
    const thread = await reply.startThread({
        name: highlightName.replace(/\\/g, ""),
    });
    for (const playerData of guildData) {
        for (const message of await createStatsEmbed(playerData)) {
            await thread.send({
                flags: MessageFlags.IsComponentsV2,
                ...message,
            });
        }
        break;
    }
}
