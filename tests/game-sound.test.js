var assert = require('node:assert');
var storedMuteValue = null;

global.localStorage = {
  getItem: function() { return storedMuteValue; },
  setItem: function(key, value) {
    if (key == 'marioMakerMuted') {
      storedMuteValue = value;
    }
  }
};

global.Audio = function(source) {
  this.source = source;
  this.volume = 1;
  this.muted = false;
  this.paused = true;
  this.ended = false;
  this.currentTime = 0;
  this.playCount = 0;
  this.pause = function() { this.paused = true; };
  this.play = function() {
    this.paused = false;
    this.playCount++;
    return Promise.resolve();
  };
};

var GameSound = require('../js/mainGame/GameSound');
var gameSound = new GameSound();
gameSound.init();

assert.equal(GameSound.volume, 0.4, 'game audio should use the reduced global volume');
GameSound.audioElements.forEach(function(audio) {
  assert.equal(audio.volume, 0.4, 'every sound should receive the global volume');
});

gameSound.play('coin');
assert.equal(GameSound.audioElements[0].playCount, 1, 'sound should play while audio is enabled');

assert.equal(GameSound.toggleMuted(), true, 'the sound toggle should mute audio');
assert.equal(storedMuteValue, 'true', 'the mute preference should be saved');
GameSound.audioElements.forEach(function(audio) {
  assert.equal(audio.muted, true, 'mute should immediately affect active audio elements');
});

gameSound.play('coin');
assert.equal(GameSound.audioElements[0].playCount, 1, 'muted sounds should not start playback');

assert.equal(GameSound.toggleMuted(), false, 'the sound toggle should restore audio');
assert.equal(storedMuteValue, 'false', 'the unmuted preference should be saved');

console.log('Game sound volume and mute checks passed.');
