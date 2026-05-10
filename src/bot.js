require('dotenv').config();

const { Telegraf, Markup } = require('telegraf');
const { fetchDailyPlayoffGames, toYmd } = require('./lib/nbaApi');
const { upsertGames, getGamesByDate, getGameById } = require('./lib/games');
const { castVote, addComment, getActivity } = require('./lib/activity');
const { safeGameLine } = require('./lib/spoiler');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('Missing TELEGRAM_BOT_TOKEN in env');

const bot = new Telegraf(token);

async function ensureDailyGames(dateStr) {
  let games = getGamesByDate(dateStr);
  if (games.length === 0) {
    const imported = await fetchDailyPlayoffGames(dateStr);
    upsertGames(imported);
    games = getGamesByDate(dateStr);
  }
  return games;
}

function voteKeyboard(gameId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('👍 Rewatch', `vote:${gameId}:up`),
      Markup.button.callback('👎 Skip', `vote:${gameId}:down`),
      Markup.button.callback('🔥 Hype', `vote:${gameId}:fire`),
    ],
  ]);
}

bot.start((ctx) =>
  ctx.reply('🏀 Spoiler-free NBA Rewatch Bot\nCommands: /today, /game <id>, /vote <id> <up|down|fire>, /activity <id>, /comment <id> <text>')
);

bot.command('today', async (ctx) => {
  const date = toYmd(new Date());
  const games = await ensureDailyGames(date);
  if (games.length === 0) return ctx.reply('Heute keine Playoff-Games gefunden. Try again later.');

  await ctx.reply(`📅 Playoff slate ${date} (spoiler-free)`);
  for (const game of games) {
    await ctx.reply(safeGameLine(game), voteKeyboard(game.id));
  }
});

bot.command('game', async (ctx) => {
  const id = ctx.message.text.split(/\s+/)[1];
  if (!id) return ctx.reply('Usage: /game <id>');

  const game = getGameById(id);
  if (!game) return ctx.reply('Game not found. Use /today first.');

  const activity = getActivity(id);
  return ctx.reply(
    `🎬 ${safeGameLine(game)}\nRound: ${game.round_label}\nStatus: ${game.status}\nHypeScore: ${activity.rankScore.toFixed(1)}\n(no score spoilers)`
  );
});

bot.command('vote', (ctx) => {
  const [, id, voteType] = ctx.message.text.trim().split(/\s+/);
  if (!id || !['up', 'down', 'fire'].includes(voteType)) {
    return ctx.reply('Usage: /vote <id> <up|down|fire>');
  }

  if (!getGameById(id)) return ctx.reply('Unknown game id. Use /today.');
  castVote(id, ctx.from, voteType);
  const a = getActivity(id);
  return ctx.reply(`✅ Vote saved: ${voteType}.\nNow: 👍${a.up} 👎${a.down} 🔥${a.fire} | score ${a.rankScore.toFixed(1)}`);
});

bot.action(/^vote:(.+):(up|down|fire)$/, async (ctx) => {
  const [, id, voteType] = ctx.match;
  if (!getGameById(id)) return ctx.answerCbQuery('Unknown game');

  castVote(id, ctx.from, voteType);
  const a = getActivity(id);
  await ctx.answerCbQuery(`Saved ${voteType}`);
  await ctx.reply(`Vote updated for #${id}: 👍${a.up} 👎${a.down} 🔥${a.fire} | Hype ${a.rankScore.toFixed(1)}`);
});

bot.command('activity', (ctx) => {
  const id = ctx.message.text.split(/\s+/)[1];
  if (!id) return ctx.reply('Usage: /activity <id>');
  if (!getGameById(id)) return ctx.reply('Unknown game id.');

  const a = getActivity(id);
  return ctx.reply(`📊 Activity #${id}\n👍 ${a.up} | 👎 ${a.down} | 🔥 ${a.fire}\n💬 comments: ${a.comments}\n👥 voters: ${a.uniqueVoters}\n🏆 rank: ${a.rankScore.toFixed(1)}`);
});

bot.command('comment', (ctx) => {
  const [, id, ...textParts] = ctx.message.text.split(/\s+/);
  const text = textParts.join(' ').trim();

  if (!id || !text) return ctx.reply('Usage: /comment <id> <text>');
  if (!getGameById(id)) return ctx.reply('Unknown game id.');

  addComment(id, ctx.from, text);
  const a = getActivity(id);
  return ctx.reply(`💬 Kommentar gespeichert for #${id}. Total comments: ${a.comments}`);
});

bot.launch().then(() => console.log('Bot running...'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
