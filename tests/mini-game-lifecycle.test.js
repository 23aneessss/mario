var assert = require('node:assert');
var MiniGame = require('../js/mainGame/MiniGame');

var scheduledCallbacks = [];
var dispatchedEvents = [];
var shownResults = [];
var hiddenResults = 0;
var legacyStarts = 0;
var miniGameStarts = 0;
var clock = 1000;

global.setTimeout = function(callback) {
  scheduledCallbacks.push(callback);
  return scheduledCallbacks.length;
};
global.clearTimeout = function() {};
global.CustomEvent = function(type, options) {
  this.type = type;
  this.detail = options.detail;
};

var canvas = { addEventListener: function() {} };
global.window = {
  performance: { now: function() { return clock; } },
  requestAnimationFrame: function() { return 1; },
  cancelAnimationFrame: function() {},
  dispatchEvent: function(event) { dispatchedEvents.push(event); }
};
global.document = {
  body: { addEventListener: function() {} },
  querySelectorAll: function() { return []; }
};
global.GameUI = {
  getInstance: function() {
    return {
      getCanvas: function() { return canvas; },
      setWidth: function() {},
      setHeight: function() {},
      show: function() {},
      hide: function() {},
      hideControls: function() {},
      clear: function() {},
      scrollWindow: function() {},
      draw: function() {},
      makeBox: function() {},
      writeText: function() {}
    };
  }
};

var scoreState = {
  coinScore: 0,
  totalScore: 0,
  lifeCount: 5,
  goombaScore: 0,
  init: function() {},
  startLegacy: function() {
    legacyStarts++;
    this.coinScore = 0;
    this.totalScore = 0;
    this.lifeCount = 5;
    this.goombaScore = 0;
  },
  startMiniGame: function(rules) {
    miniGameStarts++;
    this.coinScore = 0;
    this.totalScore = 0;
    this.lifeCount = rules.startingLives;
    this.goombaScore = 0;
  },
  displayScore: function() {},
  updateLevelNum: function() {},
  updateMiniGame: function(snapshot) {
    this.coinScore = snapshot.coinsCollected;
    this.goombaScore = snapshot.goombasKilled || 0;
    this.lifeCount = snapshot.livesRemaining;
    this.totalScore = snapshot.projectedScore;
  },
  updateLifeCount: function() {},
  updateCoinScore: function() {},
  updateTotalScore: function() {},
  showResult: function(result) { shownResults.push(result); },
  hideScore: function() { hiddenResults++; },
  gameOverView: function() {}
};

global.Score = function() { return scoreState; };
global.Mario = function() {
  this.x = 10;
  this.y = 400;
  this.width = 32;
  this.height = 44;
  this.velX = 0;
  this.velY = 0;
  this.speed = 3;
  this.frame = 0;
  this.grounded = false;
  this.jumping = false;
  this.invulnerable = false;
  this.type = 'small';
  this.init = function() {};
  this.draw = function() {};
  this.checkMarioType = function() {};
};
global.Element = function() {
  this.width = 32;
  this.height = 32;
  this.draw = function() {};
  this.platform = function() { this.type = 1; };
  this.coinBox = function() { this.type = 2; };
  this.powerUpBox = function() { this.type = 3; };
  this.uselessBox = function() { this.type = 4; };
  this.flagPole = function() { this.type = 5; };
  this.flag = function() { this.type = 6; };
  this.pipeLeft = function() { this.type = 7; };
  this.pipeRight = function() { this.type = 8; };
  this.pipeTopLeft = function() { this.type = 9; };
  this.pipeTopRight = function() { this.type = 10; };
};
global.GameSound = function() {
  this.init = function() {};
  this.play = function() {};
};
global.PowerUp = function() {};
global.Enemy = function() {
  this.width = 32;
  this.height = 32;
  this.velX = 1;
  this.velY = 0;
  this.grounded = false;
  this.goomba = function() { this.type = 20; };
  this.draw = function() {};
  this.update = function() {};
};
global.Bullet = function() {};

var MarioGame = require('../js/mainGame/MarioGame');
var game = new MarioGame();
var maps = { 1: JSON.stringify(MiniGame.createLevel()) };
var options = {
  rules: MiniGame.rules,
  calculateResult: MiniGame.calculateResult,
  onReplay: function() {},
  onMenu: function() {}
};

game.init(maps, 1, options);
assert.equal(miniGameStarts, 1, 'the built-in game should start in mini-game mode');
assert.equal(game.getPowerUpDirection(32), -1, 'the first mushroom should move away from its nearby pit');
assert.equal(game.getPowerUpDirection(108), -1, 'the second mushroom should move away from its nearby pit');

var mushroomNearPit = { type: 30, x: 35 * 32 - 34, width: 32, velX: 2 };
game.keepPowerUpAwayFromPits(mushroomNearPit);
assert.equal(mushroomNearPit.velX, -2, 'mushrooms should turn around before entering a pit');

var goombaNearPit = { x: 35 * 32 - 34, width: 32, velX: 1 };
game.keepGoombaAwayFromPits(goombaNearPit);
assert.equal(goombaNearPit.velX, -1, 'living Goombas should turn around before entering a pit');

scoreState.coinScore = 5;
game.handleMarioDeath();
assert.equal(scoreState.lifeCount, 2, 'death should remove exactly one life');
assert.equal(scheduledCallbacks.length, 1, 'death should schedule exactly one restart');
scheduledCallbacks.shift()();
assert.equal(scoreState.coinScore, 0, 'coins should reset before the next attempt');
assert.equal(scoreState.lifeCount, 2, 'restarting should preserve remaining lives');

scoreState.coinScore = 12;
var defeatedGoomba = { spawnRow: 13, spawnColumn: 10, scoreAwarded: false };
game.awardEnemyKill(defeatedGoomba);
game.awardEnemyKill(defeatedGoomba);
game.activateCheckpoint();
scoreState.coinScore = 14;
game.handleMarioDeath();
scheduledCallbacks.shift()();
assert.equal(scoreState.coinScore, 12, 'checkpoint coins should survive a later death');
assert.equal(scoreState.lifeCount, 1, 'checkpoint respawns should still consume one life');

game.finalizeMiniGame('won', 'flag');
game.finalizeMiniGame('won', 'flag');
assert.equal(shownResults.length, 1, 'the result screen should be shown once');
assert.equal(dispatchedEvents.length, 1, 'a terminal result should dispatch exactly one event');
assert.equal(dispatchedEvents[0].type, 'mario-maker:result');
assert.equal(dispatchedEvents[0].detail.outcome, 'won');
assert.equal(dispatchedEvents[0].detail.goombasKilled, 1, 'a Goomba should only be scored once');
assert.equal(dispatchedEvents[0].detail.bonuses.goombas, 2, 'a Goomba kill should award two points');

game.clearInstances();
clock = 2000;
game.init(maps, 1, options);
game.abandonGame();
game.abandonGame();
assert.equal(dispatchedEvents.length, 2, 'abandonment should also dispatch only once');
assert.equal(dispatchedEvents[1].detail.reason, 'abandoned');
assert.equal(dispatchedEvents[1].detail.score, 0);

game.clearInstances();
game.init(maps, 1);
game.abandonGame();
assert.equal(legacyStarts, 1, 'saved levels should keep the legacy score mode');
assert.equal(dispatchedEvents.length, 2, 'legacy levels should not emit mini-game results');

var finishGame = new MarioGame();
finishGame.init(maps, 1, options);
finishGame.levelFinish('r', 164 * 32);
for (var finishFrame = 0; finishFrame < 120; finishFrame++) {
  finishGame.updateFinishAnimation();
}
assert.equal(scheduledCallbacks.length, 1, 'the finish animation should schedule exactly one result');
scheduledCallbacks.shift()();
assert.equal(dispatchedEvents.length, 3, 'the finish animation should emit one completed result');
assert.equal(dispatchedEvents[2].detail.outcome, 'won');
assert.equal(dispatchedEvents[2].detail.reason, 'flag');

assert.equal(hiddenResults, 0, 'the lifecycle test should not hide results unexpectedly');
console.log('Mini-game lifecycle checks passed.');
