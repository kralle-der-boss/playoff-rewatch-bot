#!/usr/bin/env node
require('dotenv').config();

const { fetchDailyPlayoffGames, toYmd } = require('../lib/nbaApi');
const { upsertGames } = require('../lib/games');

async function refreshDate(date) {
  const games = await fetchDailyPlayoffGames(date);
  const count = upsertGames(games);
  return { date: toYmd(date), count };
}

(async () => {
  try {
    const base = process.argv[2] ? new Date(process.argv[2]) : new Date();
    if (Number.isNaN(base.getTime())) throw new Error('Invalid date. Use YYYY-MM-DD');

    const tomorrow = new Date(base);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const results = [];
    results.push(await refreshDate(base));
    results.push(await refreshDate(tomorrow));

    for (const r of results) {
      console.log(`[ok] imported ${r.count} playoff games for ${r.date}`);
    }
  } catch (err) {
    console.error('[error]', err.message);
    process.exit(1);
  }
})();
