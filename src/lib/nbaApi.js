function toYmd(date) {
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

async function fetchDailyPlayoffGames(date = new Date()) {
  const scoreboardDate = toYmd(date);
  const espnDate = scoreboardDate.replaceAll('-', '');
  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${espnDate}`;

  const res = await fetch(url, { headers: { 'User-Agent': 'playoff-rewatch-bot/0.1' } });
  if (!res.ok) throw new Error(`NBA fetch failed: ${res.status}`);

  const data = await res.json();
  const events = data.events || [];

  const normalized = events
    .filter((e) => {
      const type = e?.season?.type;
      const note = (e?.season?.slug || e?.name || '').toLowerCase();
      return type === 3 || note.includes('playoff');
    })
    .map((e) => {
      const comp = e.competitions?.[0];
      const home = comp?.competitors?.find((c) => c.homeAway === 'home');
      const away = comp?.competitors?.find((c) => c.homeAway === 'away');

      return {
        id: String(e.id),
        game_date: scoreboardDate,
        starts_at: e.date,
        home_team: home?.team?.displayName || 'Home',
        away_team: away?.team?.displayName || 'Away',
        round_label: e.season?.slug || 'playoffs',
        status: comp?.status?.type?.description || 'Scheduled',
        raw_json: JSON.stringify(e),
      };
    });

  return normalized;
}

module.exports = { fetchDailyPlayoffGames, toYmd };
