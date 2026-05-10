#!/usr/bin/env node
require('dotenv').config();

const { fetchDailyPlayoffGames, toYmd } = require('../lib/nbaApi');
const { upsertGames } = require('../lib/games');

(async () => {
  try {
    const input = process.argv[2];
    const date = input ? new Date(input) : new Date();
    if (Number.isNaN(date.getTime())) throw new Error('Invalid date. Use YYYY-MM-DD');

    const games = await fetchDailyPlayoffGames(date);
    const count = upsertGames(games);
    console.log(`[ok] imported ${count} playoff games for ${toYmd(date)}`);
  } catch (err) {
    console.error('[error]', err.message);
    process.exit(1);
  }
})();
