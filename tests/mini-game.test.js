var assert = require('node:assert');
var MiniGame = require('../js/mainGame/MiniGame');

function result(overrides) {
  var state = {
    outcome: 'won',
    reason: 'flag',
    elapsedMs: 90000,
    coinsCollected: 15,
    livesRemaining: 3
  };

  for (var key in overrides) {
    state[key] = overrides[key];
  }

  return MiniGame.calculateResult(state);
}

assert.equal(result({}).score, 200, 'a perfect run should score 200');
assert.equal(result({ elapsedMs: 90001 }).score, 199, 'the first started late second should cost one point');
assert.equal(result({ coinsCollected: 14 }).score, 195, 'one missed coin should cost five points');
assert.equal(result({ coinsCollected: 14, goombasKilled: 1 }).score, 197, 'one Goomba should add two points');
assert.equal(result({ goombasKilled: 14 }).score, 200, 'Goomba bonuses should never exceed the 200-point cap');
assert.equal(result({ livesRemaining: 2 }).score, 175, 'one lost life should cost 25 points');
assert.equal(
  result({ elapsedMs: 105000, coinsCollected: 12, livesRemaining: 2 }).score,
  145,
  'combined penalties should be deterministic'
);
assert.equal(
  result({ elapsedMs: 149999, coinsCollected: 0, livesRemaining: 1 }).score,
  15,
  'a successful run immediately before the limit should remain positive'
);
assert.equal(result({ outcome: 'lost', reason: 'time-limit' }).score, 0, 'a timeout should score zero');
assert.equal(result({ outcome: 'lost', reason: 'no-lives', livesRemaining: 0 }).score, 0, 'losing all lives should score zero');
assert.equal(result({ outcome: 'lost', reason: 'abandoned' }).score, 0, 'abandoning should score zero');

var map = MiniGame.createLevel();
var tileCounts = {};

assert.equal(map.length, 15, 'the mini-game should be 15 tiles high');
map.forEach(function(row) {
  assert.equal(row.length, 168, 'every row should be 168 tiles wide');
  row.forEach(function(tile) {
    tileCounts[tile] = (tileCounts[tile] || 0) + 1;
  });
});

assert.equal(tileCounts[2], 15, 'the level should contain exactly 15 coin boxes');
assert.equal(tileCounts[3], 2, 'the level should contain exactly two power-up boxes');
assert.equal(tileCounts[20], MiniGame.rules.totalGoombas, 'the level should contain the configured Goomba total');
assert.equal(tileCounts[6], 1, 'the level should contain exactly one flag');
assert.equal(tileCounts[5], 11, 'the level should contain one continuous flag pole');

var mediumCoins = 0;
var highCoins = 0;
for (var coinRow = 0; coinRow < map.length; coinRow++) {
  for (var coinColumn = 0; coinColumn < map[coinRow].length; coinColumn++) {
    if (map[coinRow][coinColumn] == 2) {
      for (var clearanceRow = coinRow + 1; clearanceRow <= 10; clearanceRow++) {
        assert.equal(map[clearanceRow][coinColumn], 0, 'raised coin boxes should have a clear jump path');
      }
      assert.equal(map[14][coinColumn], 1, 'every coin box should have solid ground beneath its route');

      if (coinRow == 9) {
        mediumCoins++;
      } else if (coinRow == 8) {
        highCoins++;
      }
    }
  }
}
assert.equal(mediumCoins, 4, 'four coins should require a medium-height jump');
assert.equal(highCoins, 3, 'three coins should require a precise high jump');

for (var pipeRow = 0; pipeRow < map.length; pipeRow++) {
  for (var pipeColumn = 0; pipeColumn < map[pipeRow].length; pipeColumn++) {
    if (map[pipeRow][pipeColumn] == 9 && pipeRow <= 11) {
      var openApproachTiles = 0;
      for (var approachColumn = pipeColumn - 3; approachColumn < pipeColumn; approachColumn++) {
        if (map[10][approachColumn] == 0) {
          openApproachTiles++;
        }
      }
      assert.ok(openApproachTiles >= 2, 'tall pipes should have enough open space for a running jump');
    }
  }
}

assert.equal(map[13][MiniGame.rules.checkpointColumn], 0, 'the checkpoint spawn tile should be open');
assert.equal(map[14][MiniGame.rules.checkpointColumn], 1, 'the checkpoint should have solid ground');

var longestGap = 0;
var currentGap = 0;
for (var groundColumn = 0; groundColumn < map[14].length; groundColumn++) {
  if (map[14][groundColumn] == 0) {
    currentGap++;
    longestGap = Math.max(longestGap, currentGap);
  } else {
    currentGap = 0;
  }
}
assert.ok(longestGap <= 5, 'no ground gap should require more than a controlled five-tile jump');

for (var landingColumn = 153; landingColumn <= 167; landingColumn++) {
  assert.equal(map[14][landingColumn], 1, 'the flag landing area should be solid');
}

console.log('Mini-game rules and level invariants passed.');
