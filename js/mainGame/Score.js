function Score() {
  var view = View.getInstance();

  var mainWrapper;
  var scoreWrapper;
  var coinScoreWrapper;
  var totalScoreWrapper;
  var lifeCountWrapper;
  var levelWrapper;
  var timeWrapper;
  var resultWrapper;
  var miniGameRules;
  var mode = 'legacy';

  this.coinScore = 0;
  this.totalScore = 0;
  this.lifeCount = 5;
  this.goombaScore = 0;

  var that = this;

  this.init = function() {
    if (scoreWrapper) {
      return;
    }

    mainWrapper = view.getMainWrapper();

    scoreWrapper = view.create('div');
    coinScoreWrapper = view.create('div');
    totalScoreWrapper = view.create('div');
    lifeCountWrapper = view.create('div');
    levelWrapper = view.create('div');
    timeWrapper = view.create('div');
    resultWrapper = view.create('section');

    view.addClass(scoreWrapper, 'score-wrapper');
    view.addClass(coinScoreWrapper, 'coin-score');
    view.addClass(totalScoreWrapper, 'total-score');
    view.addClass(lifeCountWrapper, 'life-count');
    view.addClass(levelWrapper, 'level-num');
    view.addClass(timeWrapper, 'time-count');
    view.addClass(resultWrapper, 'result-screen');

    resultWrapper.setAttribute('role', 'status');
    resultWrapper.setAttribute('aria-live', 'assertive');
    resultWrapper.setAttribute('aria-atomic', 'true');

    view.append(scoreWrapper, levelWrapper);
    view.append(scoreWrapper, lifeCountWrapper);
    view.append(scoreWrapper, coinScoreWrapper);
    view.append(scoreWrapper, timeWrapper);
    view.append(scoreWrapper, totalScoreWrapper);
    view.append(mainWrapper, scoreWrapper);
    view.append(mainWrapper, resultWrapper);

    that.hideResult();
    that.startLegacy();
  };

  this.startLegacy = function() {
    mode = 'legacy';
    miniGameRules = null;
    that.coinScore = 0;
    that.totalScore = 0;
    that.lifeCount = 5;
    that.goombaScore = 0;

    view.addClass(scoreWrapper, 'score-wrapper');
    view.style(levelWrapper, { display: 'block' });
    view.style(timeWrapper, { display: 'none' });
    that.updateLevelNum(1);
    that.updateCoinScore();
    that.updateTotalScore();
    that.updateLifeCount();
    that.hideResult();
  };

  this.startMiniGame = function(rules) {
    mode = 'mini-game';
    miniGameRules = rules;
    that.coinScore = 0;
    that.lifeCount = rules.startingLives;
    that.goombaScore = 0;
    that.totalScore = rules.maxScore - rules.totalCoins * rules.missedCoinPenalty;

    view.addClass(scoreWrapper, 'score-wrapper mini-game-hud');
    view.style(levelWrapper, { display: 'block' });
    view.style(timeWrapper, { display: 'block' });
    view.setHTML(levelWrapper, 'Mini Game');
    that.updateMiniGame({
      coinsCollected: 0,
      goombasKilled: 0,
      livesRemaining: that.lifeCount,
      elapsedMs: 0,
      projectedScore: that.totalScore
    });
    that.hideResult();
  };

  this.updateMiniGame = function(snapshot) {
    if (mode != 'mini-game' || !miniGameRules) {
      return;
    }

    that.coinScore = snapshot.coinsCollected;
    that.lifeCount = snapshot.livesRemaining;
    that.goombaScore = snapshot.goombasKilled || 0;
    that.totalScore = snapshot.projectedScore;

    var remainingSeconds = Math.max(0, Math.ceil((miniGameRules.timeLimitMs - snapshot.elapsedMs) / 1000));
    var timeClass = 'time-count';

    if (remainingSeconds <= 15) {
      timeClass += ' time-count-danger';
    } else if (snapshot.elapsedMs > miniGameRules.perfectTimeMs) {
      timeClass += ' time-count-warning';
    }

    view.addClass(timeWrapper, timeClass);
    view.setHTML(timeWrapper, 'Time: ' + remainingSeconds);
    view.setHTML(
      coinScoreWrapper,
      'Coins: ' + that.coinScore + '/' + miniGameRules.totalCoins + ' | G: ' + that.goombaScore + '/' + miniGameRules.totalGoombas
    );
    view.setHTML(lifeCountWrapper, 'x ' + that.lifeCount);
    view.setHTML(totalScoreWrapper, 'Points: ' + that.totalScore);
  };

  this.updateCoinScore = function() {
    if (mode == 'legacy' && that.coinScore == 100) {
      that.coinScore = 0;
      that.lifeCount++;
      that.updateLifeCount();
    }

    if (mode == 'legacy') {
      view.setHTML(coinScoreWrapper, 'Coins: ' + that.coinScore);
    }
  };

  this.updateTotalScore = function() {
    if (mode == 'legacy') {
      view.setHTML(totalScoreWrapper, 'Score: ' + that.totalScore);
    }
  };

  this.updateLifeCount = function() {
    view.setHTML(lifeCountWrapper, 'x ' + that.lifeCount);
  };

  this.updateLevelNum = function(level) {
    if (mode == 'legacy') {
      view.setHTML(levelWrapper, 'Level: ' + level);
    }
  };

  this.displayScore = function() {
    view.style(scoreWrapper, { display: mode == 'mini-game' ? 'flex' : 'block' });
  };

  this.hideScore = function() {
    view.style(scoreWrapper, { display: 'none' });
    that.hideResult();
  };

  this.showResult = function(result, callbacks) {
    var won = result.outcome == 'won';
    var title = won ? 'Challenge Clear!' : 'Run Over';
    var reasonLabels = {
      flag: 'You reached the flag.',
      'no-lives': 'No lives remaining.',
      'time-limit': 'The 150 second limit expired.',
      abandoned: 'The run was abandoned.'
    };
    var summary = reasonLabels[result.reason] || '';
    var details;

    if (won) {
      details =
        '<dl class="result-breakdown">' +
          '<div><dt>Missed coins (' + result.missedCoins + ')</dt><dd>-' + result.penalties.coins + '</dd></div>' +
          '<div><dt>Missed Goombas (' + result.missedGoombas + ')</dt><dd>-' + result.penalties.goombas + '</dd></div>' +
          '<div><dt>Lives lost (' + result.livesLost + ')</dt><dd>-' + result.penalties.lives + '</dd></div>' +
          '<div><dt>Late seconds (' + result.lateSeconds + ')</dt><dd>-' + result.penalties.time + '</dd></div>' +
        '</dl>';
    } else {
      details =
        '<dl class="result-breakdown">' +
          '<div><dt>Coins this attempt</dt><dd>' + result.coinsCollected + '/' + result.totalCoins + '</dd></div>' +
          '<div><dt>Goombas defeated</dt><dd>' + result.goombasKilled + '/' + result.totalGoombas + '</dd></div>' +
          '<div><dt>Lives remaining</dt><dd>' + result.livesRemaining + '</dd></div>' +
          '<div><dt>Active time</dt><dd>' + result.elapsedSeconds + 's</dd></div>' +
        '</dl>';
    }

    view.setHTML(
      resultWrapper,
      '<div class="result-panel result-panel-' + result.outcome + '">' +
        '<p class="result-kicker">Mario Mini Game</p>' +
        '<h1>' + title + '</h1>' +
        '<p class="result-summary">' + summary + '</p>' +
        '<p class="result-score"><span>Final score</span><strong>' + result.score + '</strong><small>/ 200</small></p>' +
        details +
        '<div class="result-actions">' +
          '<button type="button" class="result-replay">Play again</button>' +
          '<button type="button" class="result-menu">Main menu</button>' +
        '</div>' +
      '</div>'
    );

    var backButton = mainWrapper.querySelector('.back-btn');
    var soundButton = mainWrapper.querySelector('.sound-toggle');
    if (backButton) {
      view.style(backButton, { display: 'none' });
    }
    if (soundButton) {
      view.style(soundButton, { display: 'none' });
    }

    view.style(resultWrapper, { display: 'flex' });
    resultWrapper.querySelector('.result-replay').onclick = callbacks.onReplay;
    resultWrapper.querySelector('.result-menu').onclick = callbacks.onMenu;
    resultWrapper.querySelector('.result-replay').focus();
  };

  this.hideResult = function() {
    if (resultWrapper) {
      view.style(resultWrapper, { display: 'none' });
      view.setHTML(resultWrapper, '');
    }
  };

  this.gameOverView = function() {
    view.style(scoreWrapper, { background: '#101820' });
  };
}
