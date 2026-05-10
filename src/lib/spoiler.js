function stripScorePatterns(text = '') {
  return String(text)
    .replace(/\b\d{2,3}\s*[-:]\s*\d{2,3}\b/g, '[score hidden]')
    .replace(/\b(Final|OT|Overtime|won by \d+)\b/gi, '[hidden]');
}

function safeGameLine(game) {
  const start = game.starts_at ? new Date(game.starts_at).toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : 'TBD';
  return `#${game.id} | ${game.away_team} @ ${game.home_team} | ${start}`;
}

module.exports = { stripScorePatterns, safeGameLine };
