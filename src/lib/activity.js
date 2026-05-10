const db = require('./db');
const { computeRanking } = require('./ranking');

function castVote(spaceId, gameId, user, voteType) {
  db.prepare(`
    INSERT INTO votes (space_id, game_id, user_id, vote_type)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(space_id, game_id, user_id) DO UPDATE SET vote_type=excluded.vote_type, created_at=datetime('now')
  `).run(Number(spaceId), String(gameId), String(user.id), voteType);
}

function addComment(spaceId, gameId, user, text) {
  db.prepare(`
    INSERT INTO comments (space_id, game_id, user_id, username, text)
    VALUES (?, ?, ?, ?, ?)
  `).run(Number(spaceId), String(gameId), String(user.id), user.username || user.first_name || 'anon', text);
}

function getActivity(spaceId, gameId) {
  const counts = db.prepare(`
    SELECT
      SUM(CASE WHEN vote_type='up' THEN 1 ELSE 0 END) AS up,
      SUM(CASE WHEN vote_type='down' THEN 1 ELSE 0 END) AS down,
      SUM(CASE WHEN vote_type='fire' THEN 1 ELSE 0 END) AS fire,
      COUNT(*) AS unique_voters
    FROM votes
    WHERE space_id = ? AND game_id = ?
  `).get(Number(spaceId), String(gameId));

  const comments = db.prepare('SELECT COUNT(*) AS total FROM comments WHERE space_id = ? AND game_id = ?').get(Number(spaceId), String(gameId));

  const payload = {
    up: counts.up || 0,
    down: counts.down || 0,
    fire: counts.fire || 0,
    uniqueVoters: counts.unique_voters || 0,
    comments: comments.total || 0,
  };

  return {
    ...payload,
    rankScore: computeRanking(payload),
  };
}

module.exports = { castVote, addComment, getActivity };
