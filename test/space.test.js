const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');

function bootstrap() {
  const dbPath = path.join(os.tmpdir(), `playoff-rewatch-test-${Date.now()}-${Math.random()}.db`);
  process.env.DB_PATH = dbPath;

  delete require.cache[require.resolve('../src/lib/db')];
  delete require.cache[require.resolve('../src/lib/spaces')];
  delete require.cache[require.resolve('../src/lib/activity')];
  delete require.cache[require.resolve('../src/lib/games')];

  const spaces = require('../src/lib/spaces');
  const activity = require('../src/lib/activity');
  const games = require('../src/lib/games');
  return { spaces, activity, games };
}

test('space activity is isolated per space+game', () => {
  const { spaces, activity, games } = bootstrap();

  const userA = { id: 1, username: 'a' };
  const userB = { id: 2, username: 'b' };

  const s1 = spaces.createSpace('Alpha Room', userA);
  const s2 = spaces.createSpace('Beta Room', userB);

  games.upsertGames([
    {
      id: 'game-1',
      game_date: '2026-05-10',
      starts_at: '2026-05-10T18:00:00Z',
      home_team: 'Home',
      away_team: 'Away',
      round_label: 'playoffs',
      status: 'Scheduled',
      raw_json: '{}',
    },
  ]);

  activity.castVote(s1.id, 'game-1', userA, 'up');
  activity.castVote(s2.id, 'game-1', userB, 'fire');
  activity.addComment(s1.id, 'game-1', userA, 'hype');

  const a1 = activity.getActivity(s1.id, 'game-1');
  const a2 = activity.getActivity(s2.id, 'game-1');

  assert.equal(a1.up, 1);
  assert.equal(a1.fire, 0);
  assert.equal(a1.comments, 1);

  assert.equal(a2.up, 0);
  assert.equal(a2.fire, 1);
  assert.equal(a2.comments, 0);
});
