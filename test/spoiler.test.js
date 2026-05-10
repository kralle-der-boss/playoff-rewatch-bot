const test = require('node:test');
const assert = require('node:assert/strict');
const { stripScorePatterns } = require('../src/lib/spoiler');

test('stripScorePatterns hides score-ish output', () => {
  const input = 'Lakers 102-99 Celtics Final OT';
  const out = stripScorePatterns(input);
  assert.ok(!out.includes('102-99'));
  assert.ok(out.includes('[score hidden]'));
  assert.ok(out.includes('[hidden]'));
});
