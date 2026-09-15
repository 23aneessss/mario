function GameSound() {
  var sounds = {};

  this.init = function() {
    GameSound.audioElements = GameSound.audioElements.filter(function(audio) {
      return !audio.paused && !audio.ended;
    });

    sounds = {
      coin: new Audio('sounds/coin.wav'),
      powerUpAppear: new Audio('sounds/power-up-appear.wav'),
      powerUp: new Audio('sounds/power-up.wav'),
      marioDie: new Audio('sounds/mario-die.wav'),
      killEnemy: new Audio('sounds/kill-enemy.wav'),
      stageClear: new Audio('sounds/stage-clear.wav'),
      bullet: new Audio('sounds/bullet.wav'),
      powerDown: new Audio('sounds/power-down.wav'),
      jump: new Audio('sounds/jump.wav')
    };

    for (var name in sounds) {
      sounds[name].volume = GameSound.volume;
      sounds[name].muted = GameSound.muted;
      GameSound.audioElements.push(sounds[name]);
    }
  };

  this.play = function(name) {
    var sound = sounds[name];

    if (!sound || GameSound.muted) {
      return;
    }

    sound.pause();
    sound.currentTime = 0;
    sound.volume = GameSound.volume;
    sound.muted = false;

    var playAttempt = sound.play();
    if (playAttempt && playAttempt.catch) {
      playAttempt.catch(function() {});
    }
  };
}

GameSound.volume = 0.4;
GameSound.audioElements = [];
GameSound.muted = (function() {
  try {
    return localStorage.getItem('marioMakerMuted') == 'true';
  } catch (error) {
    return false;
  }
})();

GameSound.setMuted = function(muted) {
  GameSound.muted = !!muted;

  for (var index = 0; index < GameSound.audioElements.length; index++) {
    GameSound.audioElements[index].muted = GameSound.muted;
  }

  try {
    localStorage.setItem('marioMakerMuted', GameSound.muted ? 'true' : 'false');
  } catch (error) {}

  return GameSound.muted;
};

GameSound.toggleMuted = function() {
  return GameSound.setMuted(!GameSound.muted);
};

GameSound.isMuted = function() {
  return GameSound.muted;
};

if (typeof module != 'undefined' && module.exports) {
  module.exports = GameSound;
}
