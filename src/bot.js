require('dotenv').config();

const { Telegraf, Markup } = require('telegraf');
const { fetchDailyPlayoffGames, toYmd } = require('./lib/nbaApi');
const { upsertGames, getGamesByDate, getGameById } = require('./lib/games');
const { castVote, addComment, getActivity } = require('./lib/activity');
const { safeGameLine } = require('./lib/spoiler');
const { createSpace, joinSpace, getUserSpaces, resolveActiveSpace, switchActiveSpace } = require('./lib/spaces');

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

function nextDayYmd(base = new Date()) {
  const d = new Date(base);
  d.setDate(d.getDate() + 1);
  return toYmd(d);
}

function getCurrentSpaceOrReply(ctx) {
  const space = resolveActiveSpace(String(ctx.from.id));
  if (!space) {
    ctx.reply('You are not in a space yet. Use /space_create <name> or /space_join <JOIN_CODE>.');
    return null;
  }
  return space;
}

async function sendFeed(ctx, date, label) {
  const space = getCurrentSpaceOrReply(ctx);
  if (!space) return;

  const games = await ensureDailyGames(date);
  if (games.length === 0) return ctx.reply(`No playoff games found for ${label} (${date}).`);

  await ctx.reply(`📅 ${label} in #${space.slug} (${date})`);
  for (const game of games) {
    const activity = getActivity(space.id, game.id);
    await ctx.reply(
      `${safeGameLine(game)}\n👍 ${activity.up} | 👎 ${activity.down} | 🔥 ${activity.fire} | 💬 ${activity.comments}`,
      voteKeyboard(game.id)
    );
  }
}

bot.start((ctx) =>
  ctx.reply(
    '🏀 Spoiler-free NBA Rewatch Bot\nUse spaces to keep communities isolated.\nCommands: /space_create, /space_join, /spaces, /space_use, /today, /tomorrow, /game, /vote, /activity, /comment'
  )
);

bot.command('space_create', (ctx) => {
  const name = ctx.message.text.split(/\s+/).slice(1).join(' ').trim();
  if (!name) return ctx.reply('Usage: /space_create <name>');

  const space = createSpace(name, ctx.from);
  return ctx.reply(`✅ Space created: ${space.name} (#${space.slug})\nJoin code: ${space.join_code}\nShare code with your community.`);
});

bot.command('space_join', (ctx) => {
  const code = ctx.message.text.split(/\s+/)[1];
  if (!code) return ctx.reply('Usage: /space_join <JOIN_CODE>');

  const space = joinSpace(code, ctx.from);
  if (!space) return ctx.reply('Invalid join code.');
  return ctx.reply(`✅ Joined and switched to #${space.slug}`);
});

bot.command('spaces', (ctx) => {
  const spaces = getUserSpaces(String(ctx.from.id));
  const active = resolveActiveSpace(String(ctx.from.id));
  if (spaces.length === 0) return ctx.reply('No spaces yet. Create one with /space_create <name>.');

  const lines = spaces.map((s) => `${active && active.id === s.id ? '👉' : '  '} #${s.slug} (${s.name}) [${s.role}]`);
  return ctx.reply(`Your spaces:\n${lines.join('\n')}\nUse /space_use <slug> to switch.`);
});

bot.command('space_use', (ctx) => {
  const target = ctx.message.text.split(/\s+/)[1];
  if (!target) return ctx.reply('Usage: /space_use <slug|id>');

  const space = switchActiveSpace(String(ctx.from.id), target);
  if (!space) return ctx.reply('Space not found or not a member.');
  return ctx.reply(`✅ Active space switched to #${space.slug}`);
});

bot.command('today', async (ctx) => sendFeed(ctx, toYmd(new Date()), 'Today'));
bot.command('tomorrow', async (ctx) => sendFeed(ctx, nextDayYmd(new Date()), 'Tomorrow'));

bot.command('game', async (ctx) => {
  const id = ctx.message.text.split(/\s+/)[1];
  if (!id) return ctx.reply('Usage: /game <id>');

  const space = getCurrentSpaceOrReply(ctx);
  if (!space) return;

  const game = getGameById(id);
  if (!game) return ctx.reply('Game not found. Use /today first.');

  const activity = getActivity(space.id, id);
  return ctx.reply(
    `🎬 ${safeGameLine(game)}\nSpace: #${space.slug}\nRound: ${game.round_label}\nStatus: ${game.status}\nVotes: 👍${activity.up} 👎${activity.down} 🔥${activity.fire}\nComments: ${activity.comments}\nHypeScore: ${activity.rankScore.toFixed(1)}\n(no score spoilers)`
  );
});

bot.command('vote', (ctx) => {
  const [, id, voteType] = ctx.message.text.trim().split(/\s+/);
  if (!id || !['up', 'down', 'fire'].includes(voteType)) {
    return ctx.reply('Usage: /vote <id> <up|down|fire>');
  }

  const space = getCurrentSpaceOrReply(ctx);
  if (!space) return;

  if (!getGameById(id)) return ctx.reply('Unknown game id. Use /today.');
  castVote(space.id, id, ctx.from, voteType);
  const a = getActivity(space.id, id);
  return ctx.reply(`✅ Vote saved in #${space.slug}: ${voteType}.\nNow: 👍${a.up} 👎${a.down} 🔥${a.fire} | comments ${a.comments}`);
});

bot.action(/^vote:(.+):(up|down|fire)$/, async (ctx) => {
  const [, id, voteType] = ctx.match;
  const space = resolveActiveSpace(String(ctx.from.id));
  if (!space) return ctx.answerCbQuery('Join a space first');
  if (!getGameById(id)) return ctx.answerCbQuery('Unknown game');

  castVote(space.id, id, ctx.from, voteType);
  const a = getActivity(space.id, id);
  await ctx.answerCbQuery(`Saved ${voteType}`);
  await ctx.reply(`Vote updated in #${space.slug} for #${id}: 👍${a.up} 👎${a.down} 🔥${a.fire} | 💬 ${a.comments}`);
});

bot.command('activity', (ctx) => {
  const id = ctx.message.text.split(/\s+/)[1];
  if (!id) return ctx.reply('Usage: /activity <id>');

  const space = getCurrentSpaceOrReply(ctx);
  if (!space) return;

  if (!getGameById(id)) return ctx.reply('Unknown game id.');

  const a = getActivity(space.id, id);
  return ctx.reply(`📊 Activity #${id} in #${space.slug}\n👍 ${a.up} | 👎 ${a.down} | 🔥 ${a.fire}\n💬 comments: ${a.comments}\n👥 voters: ${a.uniqueVoters}\n🏆 rank: ${a.rankScore.toFixed(1)}`);
});

bot.command('comment', (ctx) => {
  const [, id, ...textParts] = ctx.message.text.split(/\s+/);
  const text = textParts.join(' ').trim();

  if (!id || !text) return ctx.reply('Usage: /comment <id> <text>');

  const space = getCurrentSpaceOrReply(ctx);
  if (!space) return;

  if (!getGameById(id)) return ctx.reply('Unknown game id.');

  addComment(space.id, id, ctx.from, text);
  const a = getActivity(space.id, id);
  return ctx.reply(`💬 Comment saved in #${space.slug} for #${id}. Total comments: ${a.comments}`);
});

bot.launch().then(() => console.log('Bot running...'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
