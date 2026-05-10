function computeRanking({ up = 0, down = 0, fire = 0, comments = 0, uniqueVoters = 0 }) {
  return (up * 2) + (fire * 3) - down + (comments * 0.5) + (uniqueVoters * 0.5);
}

function sortGamesByHype(rows) {
  return [...rows].sort((a, b) => b.rankScore - a.rankScore);
}

module.exports = { computeRanking, sortGamesByHype };
