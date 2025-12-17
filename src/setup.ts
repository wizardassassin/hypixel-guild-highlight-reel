console.log("Starting...");

if (process.env.PM2_HOME) {
    process.on("unhandledRejection", (reason, promise) => {
        process.exit(1);
    });
}
