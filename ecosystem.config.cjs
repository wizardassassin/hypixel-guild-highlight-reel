module.exports = {
    apps: [
        {
            name: "Hypixel Guild Highlight Reel",
            script: "./dist/index.js",
            interpreter_args: "--env-file=.env",
            time: true,
            log: true,
        },
    ],
};
