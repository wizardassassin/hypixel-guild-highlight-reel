import { Colors } from "discord.js";
import { DateTime } from "luxon";
import crypto from "crypto";

abstract class RandomizerItem<T> {
    abstract pick(): T;
}

class RandomizerLiteral<T> extends RandomizerItem<T> {
    #item: T;
    constructor(item: T) {
        super();
        this.#item = item;
    }
    pick() {
        return this.#item;
    }
}

function toRandomizer<T>(value: RandomizerItem<T> | T) {
    return value instanceof RandomizerItem
        ? value
        : new RandomizerLiteral(value);
}

class RandomizerWeighted<T> extends RandomizerItem<T> {
    #items: { value: RandomizerItem<T>; weight: number }[];
    constructor(...items: { value: RandomizerItem<T> | T; weight: number }[]) {
        super();
        this.#items = items.map((x) => ({
            value: toRandomizer(x.value),
            weight: x.weight,
        }));
    }
    pick() {
        const total = this.#items
            .map((x) => x.weight)
            .reduce((a, b) => a + b, 0);
        const val = Math.floor(Math.random() * total);
        let sum = 0;
        for (const item of this.#items)
            if (val < (sum += item.weight))
                return item.value instanceof RandomizerItem
                    ? item.value.pick()
                    : item.value;
        throw new Error("Invalid weights?");
    }
}

function getRandomDate() {
    const dateObj = DateTime.now().setZone("America/New_York");
    const date = dateObj.toFormat("yyyy-MM-dd");
    const hours = Math.floor(Math.random() * 24);
    const minutes = Math.floor(Math.random() * 60);
    const seconds = Math.floor(Math.random() * 60);
    return `${date} ${hours}-${minutes}-${seconds}`;
}

function getRandomLobbyId() {
    const d1 = Math.floor(Math.random() * 9) + 1;
    const d2 = Math.floor(Math.random() * 9) + 1;
    const l1 = String.fromCharCode(65 + Math.floor(Math.random() * 6));
    const l2 = String.fromCharCode(65 + Math.floor(Math.random() * 6));
    return `mini${d1}${d2}${l1}${l2}`;
}

function getRandomLobbyName() {
    const lobbies = [
        { value: "Arcade Games", weight: 1 },
        { value: "Arena Brawl", weight: 1 },
        { value: "Bed Wars", weight: 1 },
        { value: "Blitz Survival Games", weight: 1 },
        { value: "Build Battle", weight: 1 },
        { value: "Cops and Crims", weight: 1 },
        { value: "Duels", weight: 1 },
        { value: "Housing", weight: 1 },
        { value: "Mega Walls", weight: 1 },
        { value: "Murder Mystery", weight: 1 },
        { value: "Paintball Warfare", weight: 1 },
        { value: "Pit", weight: 1 },
        { value: "Prototype", weight: 1 },
        { value: "Quakecraft", weight: 1 },
        { value: "Replay", weight: 1 },
        { value: "SkyBlock", weight: 1 },
        { value: "SkyWars", weight: 1 },
        { value: "Smash Heroes", weight: 1 },
        { value: "Speed UHC", weight: 1 },
        { value: "TNT Games", weight: 1 },
        { value: "Turbo Kart Racers", weight: 1 },
        { value: "UHC Champions", weight: 1 },
        { value: "VampireZ", weight: 1 },
        { value: "VampireZ", weight: 1 },
        { value: "Walls", weight: 1 },
        { value: "Warlords", weight: 1 },
        { value: "Wool Games", weight: 1 },
    ];
    return new RandomizerWeighted(...lobbies).pick();
}

export function getSplashTextRandomizer(guildName = "") {
    const programming = new RandomizerWeighted(
        { value: "Hello World!", weight: 1 },
        {
            value: "*** stack smashing detected ***: terminated",
            weight: 1,
        },
        {
            value: "Segmentation fault (core dumped)",
            weight: 1,
        },
        { value: "NullPointerException", weight: 1 }
    );
    const afk = new RandomizerWeighted(
        {
            value: "You are AFK\nMove around to return to the lobby.",
            weight: 1,
        },
        { value: "You are AFK. Move around to return from AFK.", weight: 1 }
    );
    const limbo = new RandomizerWeighted(
        {
            value: "The lobby you attempted to join was full or offline.\nBecause of this, you were routed to Limbo, a subset of your own imagination.\nThis place doesn't exist anywhere, and you can stay here as long as you'd like.\nTo return to \"reality\", use /lobby GAME.\nExamples: /lobby, /lobby skywars, /lobby arcade\nWatch out, though, as there are things that live in Limbo.",
            weight: 1,
        },
        {
            value: "Out of sync, check your internet connection!\nYou were spawned in Limbo.\n/limbo for more information.",
            weight: 1,
        },
        {
            value: "A kick occurred in your connection, so you have been routed to limbo!\ndisconnect.spam",
            weight: 1,
        },
        {
            value: "You were spawned in Limbo.\n/limbo for more information.",
            weight: 1,
        }
    );
    const kickPre = `A kick occurred in your connection, so you were put in the ${getRandomLobbyName()} lobby!\n`;
    const kickLobby = new RandomizerWeighted(
        {
            value: `Couldn't connect you to that server, so you were put in the ${getRandomLobbyName()} lobby!`,
            weight: 1,
        },
        { value: kickPre + "send:lobby", weight: 1 },
        { value: kickPre + "Internal server error", weight: 1 },
        {
            value: `${kickPre}Server ${getRandomLobbyId()} shutdown at ${getRandomDate()}`,
            weight: 1,
        },
        { value: kickPre + "Cannot interact with self!", weight: 1 }
    );
    const skyblockPre = `Sending to server ${getRandomLobbyId()}...\nYou were kicked while joining that server!\n`;
    const skyblock = new RandomizerWeighted(
        {
            value:
                skyblockPre +
                "You tried to rejoin too fast, please try again in a moment!",
            weight: 1,
        },
        {
            value:
                skyblockPre +
                "There was an issue running migrations on your profile!",
            weight: 1,
        },
        {
            value:
                skyblockPre +
                "The world you attempted to join is presently occupied!",
            weight: 1,
        }
    );
    const misc = new RandomizerWeighted(
        { value: "Boop!", weight: 1 },
        {
            value: "You have reached your Hype limit! Add Hype to Prototype Lobby minigames by right-clicking with the Hype Diamond!",
            weight: 1,
        },
        {
            value: `Server attempted to add player prior to sending player info (Player id ${crypto.randomUUID()})\nSkipping Entity with id entity.minecraft.player`,
            weight: 1,
        },
        { value: "You cannot say the same message twice!", weight: 1 },
        { value: "/g join " + guildName, weight: 1 },
        { value: "Unknown command. Type \"/help\" for help. ('')", weight: 1 }
    );
    return new RandomizerWeighted(
        // { value: programming, weight: 1 },
        { value: afk, weight: 1 },
        { value: limbo, weight: 1 },
        { value: kickLobby, weight: 1 },
        { value: skyblock, weight: 1 },
        { value: misc, weight: 1 }
    );
}

export function getRandomColor() {
    const colors = [
        { value: Colors.Default, weight: 1 },
        { value: Colors.White, weight: 1 },
        { value: Colors.Aqua, weight: 1 },
        { value: Colors.Green, weight: 1 },
        { value: Colors.Blue, weight: 1 },
        { value: Colors.Yellow, weight: 1 },
        { value: Colors.Purple, weight: 1 },
        { value: Colors.LuminousVividPink, weight: 1 },
        { value: Colors.Fuchsia, weight: 1 },
        { value: Colors.Gold, weight: 1 },
        { value: Colors.Orange, weight: 1 },
        { value: Colors.Red, weight: 1 },
        { value: Colors.Grey, weight: 1 },
        { value: Colors.Navy, weight: 1 },
        { value: Colors.DarkAqua, weight: 1 },
        { value: Colors.DarkGreen, weight: 1 },
        { value: Colors.DarkBlue, weight: 1 },
        { value: Colors.DarkPurple, weight: 1 },
        { value: Colors.DarkVividPink, weight: 1 },
        { value: Colors.DarkGold, weight: 1 },
        { value: Colors.DarkOrange, weight: 1 },
        { value: Colors.DarkRed, weight: 1 },
        { value: Colors.DarkGrey, weight: 1 },
        { value: Colors.DarkerGrey, weight: 1 },
        { value: Colors.LightGrey, weight: 1 },
        { value: Colors.DarkNavy, weight: 1 },
        { value: Colors.Blurple, weight: 1 },
        { value: Colors.Greyple, weight: 1 },
        { value: Colors.DarkButNotBlack, weight: 1 },
        { value: Colors.NotQuiteBlack, weight: 1 },
    ];
    return new RandomizerWeighted(...colors).pick();
}
