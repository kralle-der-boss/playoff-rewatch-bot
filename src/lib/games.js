const db = require('./db');

function upsertGames(games = []) {
  const stmt = db.prepare(`
    INSERT INTO games (id, game_date, starts_at, home_team, away_team, round_label, status, raw_json)
    VALUES (@id, @game_date, @starts_at, @home_team, @away_team, @round_label, @status, @raw_json)
    ON CONFLICT(id) DO UPDATE SET
      game_date=excluded.game_date,
      starts_at=excluded.starts_at,
      home_team=excluded.home_team,
      away_team=excluded.away_team,
      round_label=excluded.round_label,
      status=excluded.status,
      raw_json=excluded.raw_json,
      imported_at=datetime('now')
  `);

  const tx = db.transaction((items) => {
    for (const g of items) stmt.run(g);
  });

  tx(games);
  return games.length;
}

function getGamesByDate(gameDate) {
  return db.prepare('SELECT * FROM games WHERE game_date = ? ORDER BY starts_at ASC').all(gameDate);
}

function getGameById(id) {
  return db.prepare('SELECT * FROM games WHERE id = ?').get(String(id));
}

module.exports = { upsertGames, getGamesByDate, getGameById };
