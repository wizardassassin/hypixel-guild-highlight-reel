# hypixel-guild-highlight-reel

A Discord Bot that creates a highlight reel for a Hypixel Guild.

## Getting Started

Code the repo.

```bash
git clone https://github.com/wizardassassin/hypixel-guild-highlight-reel.git
cd hypixel-guild-highlight-reel
```

Install dependencies.

```bash
npm ci
# or
npm i
```

Create the .env file. Replace all the variables with their corresponding values.

```bash
cp .env.example .env
nano .env # edit the file
```

Compile the code.

```bash
npm run build
```

Deploy the commands and database.

```bash
npm run deploy-cmd
npm run deploy-db
```

Add the guild entry.

```bash
npm run create-guild
```

Run the code.

```bash
npm run dev
```

## Useful Commands

Seeding the database.

```bash
npm run seed
```

Deleting the database.

```bash
npm run reset-db
```

Fetching data independent of the discord bot.

```bash
node --env-file=.env ./dist/scripts/query-only.js
```
