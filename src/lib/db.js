const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'app.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  game_date TEXT NOT NULL,
  starts_at TEXT,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  round_label TEXT,
  status TEXT,
  source TEXT DEFAULT 'espn',
  raw_json TEXT,
  imported_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS spaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  join_code TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS space_members (
  space_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (space_id, user_id),
  FOREIGN KEY (space_id) REFERENCES spaces(id)
);

CREATE TABLE IF NOT EXISTS user_context (
  user_id TEXT PRIMARY KEY,
  active_space_id INTEGER,
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (active_space_id) REFERENCES spaces(id)
);

CREATE TABLE IF NOT EXISTS votes (
  space_id INTEGER,
  game_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up','down','fire')),
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (space_id, game_id, user_id),
  FOREIGN KEY (space_id) REFERENCES spaces(id),
  FOREIGN KEY (game_id) REFERENCES games(id)
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id INTEGER,
  game_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT,
  text TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (space_id) REFERENCES spaces(id),
  FOREIGN KEY (game_id) REFERENCES games(id)
);

CREATE INDEX IF NOT EXISTS idx_votes_space_game ON votes(space_id, game_id);
CREATE INDEX IF NOT EXISTS idx_comments_space_game ON comments(space_id, game_id);
`);

function ensureColumn(table, column, typeDef) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeDef}`);
  }
}

ensureColumn('votes', 'space_id', 'INTEGER');
ensureColumn('comments', 'space_id', 'INTEGER');

module.exports = db;
