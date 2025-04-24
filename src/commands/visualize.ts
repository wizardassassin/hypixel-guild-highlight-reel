import {
    AttachmentBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    escapeMarkdown,
    InteractionContextType,
    SlashCommandBuilder,
} from "discord.js";
import { parsePlayerStat, statKeyMap } from "../db-query.js";
import sharp from "sharp";
import { JSDOM } from "jsdom";
import * as d3 from "d3";
import { DateTime } from "luxon";
import { MojangFetcher } from "../skin-fetcher.js";

export const data = new SlashCommandBuilder()
    .setName("visualize")
    .setDescription("Graphs a measurable stat of a guild member!")
    .addStringOption((option) =>
        option
            .setName("username")
            .setDescription("The username.")
            .setRequired(true)
    )
    .addStringOption((option) =>
        option
            .setName("stat")
            .setDescription("The stat to graph.")
            .setRequired(true)
    )
    .addStringOption((option) =>
        option.setName("start").setDescription("Start time (MM/dd/yy).")
    )
    .addStringOption((option) =>
        option.setName("end").setDescription("End time (MM/dd/yy).")
    )
    .addIntegerOption((option) =>
        option
            .setName("derivative")
            .setDescription(
                "Take a symmetric derivative over a time interval (days)."
            )
    )
    .addIntegerOption((option) =>
        option.setName("min-y").setDescription("Min y value for the y-axis.")
    )
    .addIntegerOption((option) =>
        option.setName("max-y").setDescription("Max y value for the y-axis.")
    )
    .setContexts(InteractionContextType.Guild);

export async function execute(interaction: ChatInputCommandInteraction) {
    const username = interaction.options.getString("username", true);
    const { uuid, username: username2 } =
        await MojangFetcher.instance.getProfile(username);
    if (!uuid) {
        await interaction.reply(`${escapeMarkdown(username)} was not found.`);
        return;
    }
    const start = interaction.options.getString("start") ?? "";
    const end = interaction.options.getString("end") ?? "";
    const startParsed = DateTime.fromFormat(start, "M/d/yy", {
        zone: "America/New_York",
    });
    const endParsed = DateTime.fromFormat(end, "M/d/yy", {
        zone: "America/New_York",
    });
    if (
        startParsed.isValid &&
        endParsed.isValid &&
        startParsed.toMillis() >= endParsed.toMillis()
    ) {
        await interaction.reply(
            `The end time has to be greater than the start time.`
        );
        return;
    }
    const data = await interaction.client.db.player.findUnique({
        where: {
            uuid: uuid,
        },
        include: {
            PlayerStats: {
                where: {
                    createdAt: {
                        ...(startParsed.isValid && {
                            gte: startParsed.toJSDate(),
                        }),
                        ...(endParsed.isValid && { lte: endParsed.toJSDate() }),
                    },
                },
                orderBy: {
                    createdAt: "asc",
                },
            },
        },
    });
    if (!data || (data?.PlayerStats?.length ?? 0) === 0) {
        await interaction.reply(
            "No data was found for " + escapeMarkdown(username2)
        );
        return;
    }
    const statName = interaction.options.getString("stat", true);
    const getStatGetter = () => {
        let stat = statKeyMap.find(
            (x) => x.name.toLowerCase() === statName.toLowerCase()
        );
        if (!stat) {
            stat = statKeyMap.find((x) =>
                x.name.toLowerCase().includes(statName.toLowerCase())
            );
        }
        return stat;
    };
    const statGetter = getStatGetter();
    if (!statGetter) {
        await interaction.reply(
            `${escapeMarkdown(statName)} stat was not found.`
        );
        return;
    }
    const data3 = data.PlayerStats.map((x) => parsePlayerStat(x)).map((x) => ({
        time: x.createdAt,
        value: statGetter.getStat(x),
    }));
    const derivH = Math.abs(interaction.options.getInteger("derivative") ?? 0);
    const data2: typeof data3 = [];
    if (derivH === 0) {
        data2.push(...data3);
    } else if (derivH >= 1) {
        for (let i = derivH; i + derivH < data3.length; i += 1) {
            const startPoint = data3[i - derivH];
            const point = data3[i];
            const endPoint = data3[i + derivH];
            data2.push({
                time: point.time,
                value: (endPoint.value - startPoint.value) / (derivH * 2),
            });
        }
    }
    if (data2.length === 0) {
        await interaction.reply(`The derivative interval was too large.`);
        return;
    }

    const digitCount = Math.floor(
        Math.max(...data2.map((x) => x.value))
    ).toString().length;

    const dom = new JSDOM();
    const body = d3.select(dom.window.document).select("body");
    const width = 928;
    const height = 500;
    const marginTop = 20;
    const marginRight = 30;
    const marginBottom = 30;
    const marginLeft = 40 + 7 * (digitCount - 3);

    const x = d3.scaleUtc(
        d3.extent(data2, (d) => d.time),
        [marginLeft, width - marginRight]
    );
    const minY = Math.min(
        interaction.options.getInteger("min-y") ?? Infinity,
        d3.min(data2, (d) => d.value)
    );
    const maxY = Math.max(
        interaction.options.getInteger("max-y") ?? -Infinity,
        d3.max(data2, (d) => d.value)
    );
    const y = d3.scaleLinear([minY, maxY], [height - marginBottom, marginTop]);

    const line = d3
        .line<(typeof data2)[number]>()
        .x((d) => x(d.time))
        .y((d) => y(d.value));

    const svg = body
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

    svg.append("rect")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("fill", "white");

    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(
            d3
                .axisBottom(x)
                .ticks(width / 80)
                .tickSizeOuter(0)
        );

    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(y).ticks(height / 40))
        .call((g) => g.select(".domain").remove())
        .call((g) =>
            g
                .selectAll(".tick line")
                .clone()
                .attr("x2", width - marginLeft - marginRight)
                .attr("stroke-opacity", 0.1)
        )
        .call((g) =>
            g
                .append("text")
                .attr("x", -marginLeft + 7)
                .attr("y", 10)
                .attr("fill", "currentColor")
                .attr("text-anchor", "start")
                .text(statGetter.name)
        );

    svg.append("path")
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", line(data2));

    // const svgHTML = (body.node() as any).innerHTML as string;
    const svgHTML = svg.node().outerHTML;
    const image = await sharp(Buffer.from(svgHTML)).png().toBuffer();
    const numberFormat2 = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
        // useGrouping: false,
    });
    const embed = new EmbedBuilder()
        .setTitle(`${statGetter.name} for ${escapeMarkdown(data.username)}`)
        .setImage("attachment://graph.png")
        .addFields(
            {
                name: "Start Time",
                value: DateTime.fromJSDate(data2.at(0).time, {
                    zone: "America/New_York",
                }).toFormat("MM/dd/yy"),
                inline: true,
            },
            {
                name: "End Time",
                value: DateTime.fromJSDate(data2.at(-1).time, {
                    zone: "America/New_York",
                }).toFormat("MM/dd/yy"),
                inline: true,
            },
            { name: "\u200b", value: "\u200b", inline: true },
            {
                name: "Min Value",
                value: numberFormat2.format(
                    Math.min(...data2.map((x) => x.value))
                ),
                inline: true,
            },
            {
                name: "Max Value",
                value: numberFormat2.format(
                    Math.max(...data2.map((x) => x.value))
                ),
                inline: true,
            },
            { name: "\u200b", value: "\u200b", inline: true }
        );
    const avatarUrl = interaction.client.user.avatarURL();
    if (avatarUrl) {
        embed.setThumbnail(avatarUrl);
    }
    const file = new AttachmentBuilder(image, {
        name: "graph.png",
    });
    await interaction.reply({
        embeds: [embed],
        files: [file],
    });
}
