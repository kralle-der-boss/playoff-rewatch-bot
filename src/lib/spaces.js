const db = require('./db');

function slugify(name) {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function generateJoinCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function createSpace(name, user) {
  const baseSlug = slugify(name) || `space-${Date.now()}`;
  let slug = baseSlug;
  let i = 1;
  while (db.prepare('SELECT id FROM spaces WHERE slug = ?').get(slug)) {
    i += 1;
    slug = `${baseSlug}-${i}`;
  }

  let joinCode = generateJoinCode();
  while (db.prepare('SELECT id FROM spaces WHERE join_code = ?').get(joinCode)) {
    joinCode = generateJoinCode();
  }

  const insert = db.prepare(`
    INSERT INTO spaces (slug, name, join_code, created_by)
    VALUES (?, ?, ?, ?)
  `);
  const member = db.prepare(`
    INSERT OR REPLACE INTO space_members (space_id, user_id, username, role)
    VALUES (?, ?, ?, 'owner')
  `);
  const ctx = db.prepare(`
    INSERT INTO user_context (user_id, active_space_id, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET active_space_id=excluded.active_space_id, updated_at=datetime('now')
  `);

  const tx = db.transaction(() => {
    const info = insert.run(slug, name, joinCode, String(user.id));
    const spaceId = info.lastInsertRowid;
    member.run(spaceId, String(user.id), user.username || user.first_name || 'anon');
    ctx.run(String(user.id), spaceId);
    return spaceId;
  });

  const spaceId = tx();
  return getSpaceById(spaceId);
}

function getSpaceById(id) {
  return db.prepare('SELECT * FROM spaces WHERE id = ?').get(Number(id));
}

function getSpaceBySlug(slug) {
  return db.prepare('SELECT * FROM spaces WHERE slug = ?').get(String(slug));
}

function joinSpace(joinCode, user) {
  const space = db.prepare('SELECT * FROM spaces WHERE join_code = ?').get(String(joinCode).toUpperCase());
  if (!space) return null;

  db.prepare(`
    INSERT OR REPLACE INTO space_members (space_id, user_id, username, role)
    VALUES (?, ?, ?, COALESCE((SELECT role FROM space_members WHERE space_id = ? AND user_id = ?), 'member'))
  `).run(space.id, String(user.id), user.username || user.first_name || 'anon', space.id, String(user.id));

  setActiveSpace(String(user.id), space.id);
  return space;
}

function setActiveSpace(userId, spaceId) {
  db.prepare(`
    INSERT INTO user_context (user_id, active_space_id, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET active_space_id=excluded.active_space_id, updated_at=datetime('now')
  `).run(String(userId), Number(spaceId));
}

function getUserSpaces(userId) {
  return db.prepare(`
    SELECT s.*, sm.role
    FROM spaces s
    JOIN space_members sm ON sm.space_id = s.id
    WHERE sm.user_id = ?
    ORDER BY s.created_at DESC
  `).all(String(userId));
}

function resolveActiveSpace(userId) {
  const selected = db.prepare(`
    SELECT s.*
    FROM user_context u
    JOIN spaces s ON s.id = u.active_space_id
    WHERE u.user_id = ?
  `).get(String(userId));

  if (selected) return selected;

  const first = db.prepare(`
    SELECT s.*
    FROM spaces s
    JOIN space_members sm ON sm.space_id = s.id
    WHERE sm.user_id = ?
    ORDER BY sm.joined_at ASC
    LIMIT 1
  `).get(String(userId));

  if (first) setActiveSpace(userId, first.id);
  return first || null;
}

function switchActiveSpace(userId, slugOrId) {
  const byId = Number(slugOrId);
  const space = Number.isInteger(byId)
    ? db.prepare(`SELECT s.* FROM spaces s JOIN space_members sm ON sm.space_id=s.id WHERE sm.user_id=? AND s.id=?`).get(String(userId), byId)
    : db.prepare(`SELECT s.* FROM spaces s JOIN space_members sm ON sm.space_id=s.id WHERE sm.user_id=? AND s.slug=?`).get(String(userId), String(slugOrId));

  if (!space) return null;
  setActiveSpace(userId, space.id);
  return space;
}

module.exports = {
  createSpace,
  joinSpace,
  getUserSpaces,
  resolveActiveSpace,
  switchActiveSpace,
};
