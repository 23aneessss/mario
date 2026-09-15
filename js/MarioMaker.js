// Main Class through which both the game and level editor are instantiated

var MarioMaker = (function() {
  var instance;

  function MarioMaker() {
    var view = View.getInstance();

    var mainWrapper;
    var startScreen;
    var btnWrapper;

    var startGameButton;

    var editorStarted = 0;
    var backToMenuBtn;
    var soundToggleButton;

    var marioGame;
    var editor;
    var createdLevels;

    var that = this;

    this.init = function() {
      marioGame = new MarioGame();
      editor = new Editor();
      createdLevels = new CreatedLevels();

      mainWrapper = view.getMainWrapper();
      startScreen = view.create('div');
      btnWrapper = view.create('div');
      startGameButton = view.create('button');
      backToMenuBtn = view.create('button');
      soundToggleButton = view.create('button');

      view.addClass(btnWrapper, 'btn-wrapper');
      view.addClass(startScreen, 'start-screen');
      view.addClass(startGameButton, 'start-btn');
      view.addClass(backToMenuBtn, 'back-btn');
      view.addClass(soundToggleButton, 'sound-toggle');

      startGameButton.setAttribute('aria-label', 'Start scored mini-game');
      backToMenuBtn.setAttribute('aria-label', 'Back to menu');
      soundToggleButton.setAttribute('type', 'button');

      view.append(startScreen, startGameButton);
      view.append(btnWrapper, backToMenuBtn);
      view.append(btnWrapper, soundToggleButton);
      view.append(mainWrapper, startScreen);
      view.append(mainWrapper, btnWrapper);

      backToMenuBtn.onclick = that.backToMenu;
      soundToggleButton.onclick = that.toggleSound;
      startGameButton.onclick = that.startMiniGame;

      that.updateSoundButton();
    };

    this.loadMainGameMap = function() {
      return { 1: JSON.stringify(MiniGame.createLevel()) };
    };

    this.startMiniGame = function() {
      var map = that.loadMainGameMap();

      that.startGame(map, {
        rules: MiniGame.rules,
        calculateResult: MiniGame.calculateResult,
        onReplay: that.startMiniGame,
        onMenu: that.backToMenu
      });
    };

    this.startGame = function(levelMap, options) {
      view.style(backToMenuBtn, { display: 'block' });
      view.style(soundToggleButton, { display: 'block' });
      that.updateSoundButton();

      marioGame.clearInstances();
      marioGame.init(levelMap, 1, options);

      that.hideMainMenu();
      editor.removeEditorScreen();
      createdLevels.removeCreatedLevelsScreen();
    };

    this.startEditor = function() {
      view.style(backToMenuBtn, { display: 'block' });

      if (editorStarted == 0) {
        editor.init();
        editorStarted = 1;
      } else {
        editor.showEditorScreen();
      }

      that.hideMainMenu();
      marioGame.removeGameScreen();
      createdLevels.removeCreatedLevelsScreen();
    };

    this.startCreatedLevels = function() {
      view.style(backToMenuBtn, { display: 'block' });

      createdLevels.init();
      that.hideMainMenu();
      marioGame.removeGameScreen();
      editor.removeEditorScreen();
    };

    this.backToMenu = function() {
      marioGame.abandonGame();
      marioGame.pauseGame();
      marioGame.clearTimeOut();
      marioGame.removeGameScreen();

      editor.removeEditorScreen();
      createdLevels.removeCreatedLevelsScreen();
      that.showMainMenu();

      view.style(backToMenuBtn, { display: 'none' });
      view.style(soundToggleButton, { display: 'none' });
    };

    this.toggleSound = function() {
      GameSound.toggleMuted();
      that.updateSoundButton();
      soundToggleButton.blur();
    };

    this.updateSoundButton = function() {
      var muted = GameSound.isMuted();
      view.setHTML(soundToggleButton, muted ? 'Muted' : 'Sound on');
      soundToggleButton.setAttribute('aria-pressed', muted ? 'true' : 'false');
      soundToggleButton.setAttribute('aria-label', muted ? 'Unmute game audio' : 'Mute game audio');
    };

    this.hideMainMenu = function() {
      view.style(startScreen, { display: 'none' });
    };

    this.showMainMenu = function() {
      view.style(startScreen, { display: 'block' });
    };
  }

  return {
    getInstance: function() {
      if (instance == null) {
        instance = new MarioMaker();
      }

      return instance;
    }
  };
})();
