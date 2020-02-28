# repost-vk-to-telegram
Bot written in JavaScript (node.js) for reposting posts from VK groups to Telegram groups/channels.

## Features:
- Reposts text, videos, pictures, links, reposts from other groups
- Reposts multiple pictures as albums
- Captions for pictures (if possible)
- Database-driven storage
- Support for SQLite, MySQL, PostgreSQL as storage
- Adblocker
- Converts VK inline links to Telegram Markdown (v2)

## Requirements
- node.js (tested on v12)
- Working yarn or npm
- Telegram bot with token (contact [@BotFather](https://t.me/BotFather) to obtain a one)
- VK application with token

**Notice.** Better use one Telegram bot per VK group. The number of messages Telegram bots can send sequentually is limited, which may result in slow reposting. 

However, if you know there aren't many posts per day in your VK groups, you can ignore this.

## Installation
#### 1. Clone the repository
`git clone https://github.com/lurepheonix/repost-vk-to-telegram`

#### 2. Copy template .env file (.env.template) to .env.

`cp .env.template .env`

Or use your file manager.

#### 3. Install dependencies

Firstly, install dependencies from `package.json`.

`yarn install`

Or, with npm:

`npm install`

**No database engines are included** into `package.json` by default. This was made intentionally in order to avoid unnecessary garbage. You will need to install them yourself.

Use `npm install package` or `yarn add package` to install a one from the following list.

| Database  | Package |
|-----------|---------|
| MySQL     | mysql2  |
| SQLite    | sqlite  |
| PostgreSQL| pg      |

Great, your bot is installed!

#### 4. Configuration

All of the configuration options except extended adblocker rules are located in `.env` file. It already contains some recommended settings enabled/disabled; you may adjust them.

`vk_token`

A token for your VK app. Must be **in** quotes.

`vk_group_id`

ID of the VK group you want to repost from. Integer (something like `-123456789`), must be **without** quotes.

`tg_token`

Token for your Telegram bot. Must be **in** quotes.

`tg_group`

A Telegram channel/group you want to repost into. You can either use an ID or channel/chat name here.

1. ID: like `123456789`, **without** quotes.
2. Channel/group name: `'@your_channel_name'`, **in** quotes.

`silent_mode`

`0` — enabled, `1` — disabled.

Whether messages are sent silent or the user should be notified of them.

`adblocker`

`0` — enabled, `1` — disabled.

Whether posts marked by VK as ads (`marked_as_ads`) are reposted to Telegram.

`extended_adblocker`

`0` — enabled, `1` — disabled.

Sometimes, there are some posts that aren't marked as ads, but you don't want see them in your Telegram group.

You can specify additional keywords for such posts in `adblocker_rules.js`. An empty template is provided, just copy `adblocker_rules.template.js` to `adblocker_rules.js` and fill it with your keywords.

For example, to block Twitch links and everything formed from the word "evacuate" (evacuator, evacuation, etc):

```
const adblockerRules = [
    "twitch.tv",
    "evacuat"
]

module.exports = { adblockerRules }
```

**Notice:** this is a JavaScript array, so you should omit the comma after the last string in array and place the keywords in quotes.

`enable_reposts`

`0` — enabled, `1` — disabled.

Enable processing of reposts from another groups as separate Telegram posts.

`DB_DRIVER`

The database engine that will be used. Currently available options are `mysql`, `sqlite`, `postgres`. MongoDB will probably be added in the future.

`MySQL, SQLite and PostgreSQL sections`

Settings for different databases, like hostname, database, user, port, table name or file name.

**Notice:** you can use different tables in a database for posts from different groups.
For SQLite, installation of no additional database is required, it will work out if the box.

`visual_logs`

`0` — enabled, `1` — disabled.

Used for debugging or seeing of what is reposted.

`debug_logs`

`0` — enabled, `1` — disabled.

Displays additional debugging info into console.

`db_add`

`0` — enabled, `1` — disabled.

Add posts to database. **Always enable**, this flag is used only for testing purposes.

#### 5. First run

If the database table was not created or used before, we need to create and seed it with a correct schema.

For SQLite, this also creates a database file.

This step is unnecessary if you have migrated the data from another bot installation.

Run in console: `node index.js seed`

## Usage

`node index.js`

**Notice:** you can automate polling with cron on Linux to run the script once in every `n` minutes. 

Polling inside bot will be added later.

## Upgrading

Reset package.json to original version:

`git checkout @ -- package.json`

Upgrade from remote repository: 

`git pull`

Reinstall dependencies.