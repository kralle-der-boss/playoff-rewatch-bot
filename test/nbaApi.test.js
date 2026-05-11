const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchDailyPlayoffGames } = require('../src/lib/nbaApi');

test('fetchDailyPlayoffGames keeps the requested scoreboard date for late UTC tip-offs', async () => {
  const originalFetch = global.fetch;

  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      events: [
        {
          id: '401871336',
          date: '2026-05-12T00:00Z',
          name: 'Detroit Pistons at Cleveland Cavaliers',
          season: { type: 3, slug: 'post-season' },
          competitions: [
            {
              status: {
                type: {
                  description: 'Scheduled',
                },
              },
              competitors: [
                {
                  homeAway: 'home',
                  team: { displayName: 'Cleveland Cavaliers' },
                },
                {
                  homeAway: 'away',
                  team: { displayName: 'Detroit Pistons' },
                },
              ],
            },
          ],
        },
      ],
    }),
  });

  try {
    const [game] = await fetchDailyPlayoffGames('2026-05-11');

    assert.equal(game.game_date, '2026-05-11');
    assert.equal(game.starts_at, '2026-05-12T00:00Z');
    assert.equal(game.home_team, 'Cleveland Cavaliers');
    assert.equal(game.away_team, 'Detroit Pistons');
  } finally {
    global.fetch = originalFetch;
  }
});
