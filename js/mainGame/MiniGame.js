var MiniGame = (function() {
  var rules = {
    startingLives: 3,
    maxScore: 200,
    totalCoins: 15,
    totalGoombas: 14,
    goombaPoints: 2,
    checkpointColumn: 126,
    perfectTimeMs: 90000,
    timeLimitMs: 150000,
    missedCoinPenalty: 5,
    lostLifePenalty: 25,
    lateSecondPenalty: 1
  };

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function getMetrics(state) {
    var elapsedMs = Math.max(0, state.elapsedMs || 0);
    var coinsCollected = clamp(state.coinsCollected || 0, 0, rules.totalCoins);
    var goombasKilled = clamp(state.goombasKilled || 0, 0, rules.totalGoombas);
    var livesRemaining = clamp(state.livesRemaining || 0, 0, rules.startingLives);

    return {
      elapsedMs: elapsedMs,
      elapsedSeconds: Math.ceil(elapsedMs / 1000),
      coinsCollected: coinsCollected,
      missedCoins: rules.totalCoins - coinsCollected,
      goombasKilled: goombasKilled,
      missedGoombas: rules.totalGoombas - goombasKilled,
      livesRemaining: livesRemaining,
      livesLost: rules.startingLives - livesRemaining,
      lateSeconds: Math.ceil(Math.max(0, elapsedMs - rules.perfectTimeMs) / 1000)
    };
  }

  function calculateResult(state) {
    var metrics = getMetrics(state);
    var penalties = {
      coins: metrics.missedCoins * rules.missedCoinPenalty,
      goombas: metrics.missedGoombas * rules.goombaPoints,
      lives: metrics.livesLost * rules.lostLifePenalty,
      time: metrics.lateSeconds * rules.lateSecondPenalty
    };
    var won = state.outcome == 'won';
    var score = won
      ? clamp(rules.maxScore - penalties.coins - penalties.goombas - penalties.lives - penalties.time, 1, rules.maxScore)
      : 0;

    return {
      outcome: won ? 'won' : 'lost',
      reason: state.reason,
      score: score,
      elapsedMs: metrics.elapsedMs,
      elapsedSeconds: metrics.elapsedSeconds,
      coinsCollected: metrics.coinsCollected,
      totalCoins: rules.totalCoins,
      goombasKilled: metrics.goombasKilled,
      missedGoombas: metrics.missedGoombas,
      totalGoombas: rules.totalGoombas,
      livesRemaining: metrics.livesRemaining,
      livesStarted: rules.startingLives,
      missedCoins: metrics.missedCoins,
      livesLost: metrics.livesLost,
      lateSeconds: metrics.lateSeconds,
      penalties: penalties
    };
  }

  function createLevel() {
    var rows = 15;
    var columns = 168;
    var map = [];

    for (var row = 0; row < rows; row++) {
      map[row] = [];
      for (var column = 0; column < columns; column++) {
        map[row][column] = row == rows - 1 ? 1 : 0;
      }
    }

    function setTile(row, column, value) {
      map[row][column] = value;
    }

    function fill(row, startColumn, endColumn, value) {
      for (var column = startColumn; column <= endColumn; column++) {
        setTile(row, column, value);
      }
    }

    function gap(startColumn, endColumn) {
      fill(14, startColumn, endColumn, 0);
    }

    function pipe(column, topRow) {
      setTile(topRow, column, 9);
      setTile(topRow, column + 1, 10);

      for (var row = topRow + 1; row <= 13; row++) {
        setTile(row, column, 7);
        setTile(row, column + 1, 8);
      }
    }

    function blockGroup(row, startColumn, endColumn) {
      fill(row, startColumn, endColumn, 4);
    }

    // Six readable pits become wider as the challenge progresses.
    gap(35, 38);
    gap(54, 57);
    gap(73, 77);
    gap(111, 115);
    gap(136, 139);
    gap(149, 152);

    // Familiar pipes establish the rhythm and contain moving enemies.
    pipe(13, 12);
    pipe(22, 11);
    pipe(42, 12);
    pipe(60, 11);
    pipe(67, 12);
    pipe(86, 11);
    pipe(101, 11);
    pipe(120, 11);
    pipe(129, 11);
    pipe(143, 11);

    // Floating blocks and short stair shapes make each section visually distinct.
    blockGroup(10, 6, 10);
    blockGroup(10, 28, 33);
    blockGroup(10, 45, 47);
    blockGroup(10, 51, 53);
    blockGroup(10, 62, 64);
    blockGroup(12, 77, 80);
    blockGroup(11, 79, 82);
    blockGroup(10, 81, 83);
    blockGroup(10, 94, 98);
    blockGroup(10, 107, 110);
    blockGroup(10, 116, 117);
    blockGroup(10, 124, 126);
    blockGroup(10, 131, 133);
    blockGroup(10, 140, 141);
    blockGroup(10, 152, 154);
    blockGroup(13, 33, 34);
    blockGroup(12, 34, 34);
    blockGroup(13, 147, 148);
    blockGroup(12, 148, 148);

    // Fifteen coin boxes, three in each section. Later groups mix standard,
    // medium and high jumps so a perfect coin run costs deliberate time.
    var coins = [
      [10, 7], [9, 8], [10, 9],
      [10, 29], [8, 46], [10, 52],
      [10, 63], [9, 83], [8, 95],
      [10, 98], [9, 117], [8, 126],
      [10, 132], [9, 141], [10, 153]
    ];

    for (var coinIndex = 0; coinIndex < coins.length; coinIndex++) {
      for (var clearanceRow = coins[coinIndex][0] + 1; clearanceRow <= 10; clearanceRow++) {
        setTile(clearanceRow, coins[coinIndex][1], 0);
      }
      setTile(coins[coinIndex][0], coins[coinIndex][1], 2);
    }

    // Two optional safety power-ups. Neither is required to finish or collect coins.
    setTile(10, 32, 3);
    setTile(10, 108, 3);

    // Fourteen Goombas, distributed 2 / 3 / 3 / 4 / 2 through the difficulty curve.
    var enemies = [10, 18, 31, 48, 50, 65, 84, 91, 99, 106, 118, 124, 133, 145];
    for (var enemyIndex = 0; enemyIndex < enemies.length; enemyIndex++) {
      setTile(13, enemies[enemyIndex], 20);
    }

    // One flag with a wide, unobstructed finish area after the final blocks.
    setTile(3, 163, 6);
    for (var flagRow = 3; flagRow <= 13; flagRow++) {
      setTile(flagRow, 164, 5);
    }

    return map;
  }

  return {
    rules: rules,
    calculateResult: calculateResult,
    createLevel: createLevel
  };
})();

if (typeof module != 'undefined' && module.exports) {
  module.exports = MiniGame;
}
