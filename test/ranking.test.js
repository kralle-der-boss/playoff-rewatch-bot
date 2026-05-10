const test = require('node:test');
const assert = require('node:assert/strict');
const { computeRanking } = require('../src/lib/ranking');

test('computeRanking weights votes + activity correctly', () => {
  const score = computeRanking({ up: 3, down: 1, fire: 2, comments: 4, uniqueVoters: 5 });
  assert.equal(score, 15.5);
});
