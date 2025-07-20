import { Colors } from "discord.js";

interface RandomizerItem<T> {
    pick(): T;
}

class RandomizerLiteral<T> implements RandomizerItem<T> {
    #item: T;
    constructor(item: T) {
        this.#item = item;
    }
    pick() {
        return this.#item;
    }
}

class RandomizerWeighted<T> implements RandomizerItem<T> {
    #items: { value: RandomizerItem<T>; weight: number }[];
    constructor(...items: { value: RandomizerItem<T>; weight: number }[]) {
        this.#items = items;
    }
    pick() {
        const total = this.#items
            .map((x) => x.weight)
            .reduce((a, b) => a + b, 0);
        const val = Math.floor(Math.random() * total);
        let sum = 0;
        for (const item of this.#items)
            if (val < (sum += item.weight)) return item.value.pick();
        throw new Error("Invalid weights?");
    }
}

function getRandomLobbyId() {
    const d1 = Math.floor(Math.random() * 9) + 1;
    const d2 = Math.floor(Math.random() * 9) + 1;
    const l1 = String.fromCharCode(65 + Math.floor(Math.random() * 6));
    const l2 = String.fromCharCode(65 + Math.floor(Math.random() * 6));
    return `mini${d1}${d2}${l1}${l2}`;
}

function getRandomLobbyName() {
    return;
}

export function getSplashTextRandomizer() {
    return new RandomizerWeighted(
        { value: new RandomizerLiteral("Hello World!"), weight: 1 },
        { value: new RandomizerLiteral("Boop!"), weight: 1 },
        { value: new RandomizerLiteral("Hello, ${username}!"), weight: 1 },
        { value: new RandomizerLiteral("Killed"), weight: 1 },
        {
            value: new RandomizerLiteral(
                "*** stack smashing detected ***: terminated"
            ),
            weight: 1,
        },
        {
            value: new RandomizerLiteral("Segmentation fault (core dumped)"),
            weight: 1,
        },
        { value: new RandomizerLiteral("NullPointerException"), weight: 1 },
        { value: new RandomizerLiteral("The cake is a lie."), weight: 1 }
    );
}

export function getRandomColor(prevColor?: number) {
    const colors = [
        Colors.Default,
        Colors.White,
        Colors.Aqua,
        Colors.Green,
        Colors.Blue,
        Colors.Yellow,
        Colors.Purple,
        Colors.LuminousVividPink,
        Colors.Fuchsia,
        Colors.Gold,
        Colors.Orange,
        Colors.Red,
        Colors.Grey,
        Colors.Navy,
        Colors.DarkAqua,
        Colors.DarkGreen,
        Colors.DarkBlue,
        Colors.DarkPurple,
        Colors.DarkVividPink,
        Colors.DarkGold,
        Colors.DarkOrange,
        Colors.DarkRed,
        Colors.DarkGrey,
        Colors.DarkerGrey,
        Colors.LightGrey,
        Colors.DarkNavy,
        Colors.Blurple,
        Colors.Greyple,
        Colors.DarkButNotBlack,
        Colors.NotQuiteBlack,
    ].filter((x) => x !== prevColor);
    return colors[Math.floor(Math.random() * colors.length)];
}
