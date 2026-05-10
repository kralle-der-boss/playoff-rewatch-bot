# playoff-rewatch-bot

Spoiler-free Telegram bot for NBA playoff rewatch decisions.

## MVP Features

- `/today` → lists today's playoff games (no score shown) + inline vote buttons
- `/game <id>` → spoiler-free game details
- `/vote <id> <up|down|fire>` → manual vote command
- inline votes (`👍 / 👎 / 🔥`) under each game
- `/activity <id>` → vote counts + comment count + rank score
- `/comment <id> <text>` → lightweight game discussion with activity tracking
- SQLite storage (`better-sqlite3`)
- Daily importer script for playoff games from ESPN public endpoint
- Basic tests for ranking and spoiler filtering helpers

UX is concise and mixed DE/EN friendly.

---

## Stack

- Node.js (CommonJS)
- [Telegraf](https://telegraf.js.org/)
- SQLite via `better-sqlite3`
- Data source: ESPN NBA scoreboard API (no key required)

---

## Quick Start

```bash
git clone https://github.com/kralle-der-boss/playoff-rewatch-bot.git
cd playoff-rewatch-bot
npm install
cp .env.example .env
# fill TELEGRAM_BOT_TOKEN
npm run refresh
npm start
```

Bot starts polling immediately.

---

## Commands

- `/today`
- `/game <id>`
- `/vote <id> <up|down|fire>`
- `/activity <id>`
- `/comment <id> <text>`

### Ranking Formula

`rank = up*2 + fire*3 - down + comments*0.5 + uniqueVoters*0.5`

---

## Daily Refresh (cron-friendly)

Manual:

```bash
npm run refresh
# or specific date
node src/scripts/refreshGames.js 2026-05-10
```

Cron example (every morning 09:00):

```cron
0 9 * * * cd /path/to/playoff-rewatch-bot && /usr/bin/env bash -lc 'npm run refresh >> refresh.log 2>&1'
```

---

## Environment

`.env`:

```ini
TELEGRAM_BOT_TOKEN=...
DB_PATH=./data/app.db
```

Required keys:

- `TELEGRAM_BOT_TOKEN` (from @BotFather)

No NBA API key required for current ESPN source.

---

## Tests

```bash
npm test
```

---

## Notes

- Bot intentionally hides scores/results in regular outputs.
- ESPN payload still includes scores internally in raw JSON for debugging, but user-facing messages stay spoiler-free.
- MVP scope: bot-managed comments (`/comment`) as per-game discussion mode.
