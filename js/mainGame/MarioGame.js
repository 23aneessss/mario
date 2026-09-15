// Main Class of Mario Game

function MarioGame() {
  var gameUI = GameUI.getInstance();

  var maxWidth; //width of the game world
  var height;
  var viewPort; //width of canvas, viewPort that can be seen
  var tileSize;
  var map;
  var originalMaps;

  var translatedDist; //distance translated(side scrolled) as mario moves to the right
  var centerPos; //center position of the viewPort, viewable screen
  var marioInGround;

  //instances
  var mario;
  var element;
  var gameSound;
  var score;

  var keys = [];
  var goombas;
  var powerUps;
  var bullets;
  var bulletFlag = false;

  var currentLevel;

  var animationID;
  var animationGeneration = 0;
  var timeOutId;

  var gameOptions;
  var miniGameRules;
  var isMiniGame = false;
  var compactView = false;
  var cameraTop = 0;
  var canvasHeight = 480;
  var runState = 'idle';
  var inputsBound = false;
  var resultEmitted = false;
  var runStartedAt = 0;
  var pausedAt = 0;
  var pausedDuration = 0;
  var frozenElapsedMs = 0;
  var lastHudSignature = '';
  var checkpoint = null;
  var collectedCoins = [];
  var killedEnemies = [];
  var goombasKilled = 0;
  var checkpointMessageTicks = 0;
  var finishAnimation = null;

  var tickCounter = 0; //for animating mario
  var maxTick = 25; //max number for ticks to show mario sprite
  var instructionTick = 0; //showing instructions counter
  var that = this;

  this.init = function(levelMaps, level, options) {
    that.pauseGame();
    that.clearTimeOut();

    height = 480;
    compactView = !!(
      window.matchMedia &&
      window.matchMedia('(max-width: 900px), (pointer: coarse)').matches
    );
    viewPort = compactView ? 480 : 960;
    cameraTop = compactView ? 96 : 0;
    canvasHeight = height - cameraTop;
    tileSize = 32;
    currentLevel = level;
    originalMaps = levelMaps;
    gameOptions = options || null;
    miniGameRules = gameOptions && gameOptions.rules;
    isMiniGame = !!miniGameRules;
    runState = 'running';
    resultEmitted = false;
    runStartedAt = that.now();
    pausedAt = 0;
    pausedDuration = 0;
    frozenElapsedMs = 0;
    lastHudSignature = '';
    checkpoint = null;
    collectedCoins = [];
    killedEnemies = [];
    goombasKilled = 0;
    checkpointMessageTicks = 0;
    finishAnimation = null;
    instructionTick = 0;
    tickCounter = 0;
    keys = [];

    if (!score) {
      score = new Score();
      score.init();
    }

    if (isMiniGame) {
      score.startMiniGame(miniGameRules);
    } else {
      score.startLegacy();
    }

    score.displayScore();
    score.updateLevelNum(currentLevel);

    that.bindKeyPress();
    that.loadLevel();
  };

  this.loadLevel = function() {
    maxWidth = 0;
    translatedDist = 0;
    centerPos = viewPort / 2;
    goombas = [];
    powerUps = [];
    bullets = [];
    bulletFlag = false;
    finishAnimation = null;
    map = JSON.parse(originalMaps[currentLevel]);

    if (isMiniGame && checkpoint) {
      for (var coinIndex = 0; coinIndex < checkpoint.collectedCoins.length; coinIndex++) {
        var savedCoin = checkpoint.collectedCoins[coinIndex];
        map[savedCoin.row][savedCoin.column] = 4;
      }

      for (var enemyIndex = 0; enemyIndex < checkpoint.killedEnemies.length; enemyIndex++) {
        var savedEnemy = checkpoint.killedEnemies[enemyIndex];
        map[savedEnemy.row][savedEnemy.column] = 0;
      }
    }

    gameUI.setWidth(viewPort);
    gameUI.setHeight(canvasHeight);
    gameUI.show();

    if (cameraTop) {
      gameUI.scrollWindow(0, -cameraTop);
    }

    mario = new Mario();
    mario.init(height);
    element = new Element();
    gameSound = new GameSound();
    gameSound.init();

    that.calculateMaxWidth();

    if (isMiniGame && checkpoint) {
      mario.x = checkpoint.spawnX;
      translatedDist = Math.min(
        maxWidth - viewPort,
        Math.max(0, checkpoint.spawnX - viewPort * 0.25)
      );
      centerPos = translatedDist + viewPort / 2;
      gameUI.scrollWindow(-translatedDist, 0);
    }

    animationGeneration++;
    that.startGame(animationGeneration);
  };

  that.calculateMaxWidth = function() {
    maxWidth = map.length ? map[0].length * tileSize : 0;
  };

  that.bindKeyPress = function() {
    if (inputsBound) {
      return;
    }

    inputsBound = true;
    var canvas = gameUI.getCanvas(); //for use with touch events
    var mobileButtons = document.querySelectorAll('.mobile-control');

    function getTouchX(touch) {
      var bounds = canvas.getBoundingClientRect();
      return (touch.clientX - bounds.left) * (canvas.width / bounds.width);
    }

    //key binding
    document.body.addEventListener('keydown', function(e) {
      if (runState == 'running') {
        keys[e.keyCode] = true;
      }
    });

    document.body.addEventListener('keyup', function(e) {
      keys[e.keyCode] = false;
    });

    for (var buttonIndex = 0; buttonIndex < mobileButtons.length; buttonIndex++) {
      (function(button) {
        var keyCode = parseInt(button.getAttribute('data-key-code'), 10);

        function pressControl(event) {
          event.preventDefault();

          if (runState != 'running') {
            return;
          }

          keys[keyCode] = true;
          button.classList.add('is-pressed');

          if (button.setPointerCapture && event.pointerId != null) {
            button.setPointerCapture(event.pointerId);
          }
        }

        function releaseControl(event) {
          event.preventDefault();
          keys[keyCode] = false;
          button.classList.remove('is-pressed');
        }

        button.addEventListener('pointerdown', pressControl);
        button.addEventListener('pointerup', releaseControl);
        button.addEventListener('pointercancel', releaseControl);
        button.addEventListener('lostpointercapture', releaseControl);
        button.addEventListener('contextmenu', function(event) {
          event.preventDefault();
        });
      })(mobileButtons[buttonIndex]);
    }

    //key binding for touch events
    canvas.addEventListener('touchstart', function(e) {
      if (runState != 'running') {
        return;
      }

      var touches = e.changedTouches;
      e.preventDefault();

      for (var i = 0; i < touches.length; i++) {
        var touchX = getTouchX(touches[i]);
        if (touchX <= viewPort * 0.16) {
          keys[37] = true; //left arrow
        }
        if (touchX > viewPort * 0.16 && touchX < viewPort * 0.32) {
          keys[39] = true; //right arrow
        }
        if (touchX > viewPort * 0.5 && touchX <= viewPort * 0.84) {
          //in touch events, same area acts as sprint and bullet key
          keys[16] = true; //shift key
          keys[17] = true; //ctrl key
        }
        if (touchX > viewPort * 0.84 && touchX < viewPort) {
          keys[32] = true; //space
        }
      }
    });

    canvas.addEventListener('touchend', function(e) {
      var touches = e.changedTouches;
      e.preventDefault();

      for (var i = 0; i < touches.length; i++) {
        var touchX = getTouchX(touches[i]);
        if (touchX <= viewPort * 0.16) {
          keys[37] = false;
        }
        if (touchX > viewPort * 0.16 && touchX <= viewPort * 0.5) {
          keys[39] = false;
        }
        if (touchX > viewPort * 0.5 && touchX <= viewPort * 0.84) {
          keys[16] = false;
          keys[17] = false;
        }
        if (touchX > viewPort * 0.84 && touchX < viewPort) {
          keys[32] = false;
        }
      }
    });

    canvas.addEventListener('touchmove', function(e) {
      if (runState != 'running') {
        return;
      }

      var touches = e.changedTouches;
      e.preventDefault();

      for (var i = 0; i < touches.length; i++) {
        var touchX = getTouchX(touches[i]);
        if (touchX <= viewPort * 0.16) {
          keys[37] = true;
          keys[39] = false;
        }
        if (touchX > viewPort * 0.16 && touchX < viewPort * 0.32) {
          keys[39] = true;
          keys[37] = false;
        }
        if (touchX > viewPort * 0.5 && touchX <= viewPort * 0.84) {
          keys[16] = true;
          keys[32] = false;
        }
        if (touchX > viewPort * 0.84 && touchX < viewPort) {
          keys[32] = true;
          keys[16] = false;
          keys[17] = false;
        }
      }
    });
  };

  this.now = function() {
    return window.performance && window.performance.now ? window.performance.now() : Date.now();
  };

  this.getElapsedMs = function() {
    if (!isMiniGame) {
      return 0;
    }

    if (runState == 'finishing' || runState == 'finish-delay' || runState == 'won') {
      return frozenElapsedMs;
    }

    var currentTime = pausedAt || that.now();
    return Math.max(0, currentTime - runStartedAt - pausedDuration);
  };

  this.pauseRunClock = function() {
    if (isMiniGame && !pausedAt) {
      pausedAt = that.now();
    }
  };

  this.resumeRunClock = function() {
    if (isMiniGame && pausedAt) {
      pausedDuration += that.now() - pausedAt;
      pausedAt = 0;
    }
  };

  this.updateMiniGameHud = function() {
    if (!isMiniGame) {
      return;
    }

    var elapsedMs = that.getElapsedMs();
    var remainingSeconds = Math.max(0, Math.ceil((miniGameRules.timeLimitMs - elapsedMs) / 1000));
    var lateSeconds = Math.ceil(Math.max(0, elapsedMs - miniGameRules.perfectTimeMs) / 1000);
    var hudSignature = [remainingSeconds, lateSeconds, score.coinScore, goombasKilled, score.lifeCount].join(':');

    if (hudSignature == lastHudSignature) {
      return;
    }

    lastHudSignature = hudSignature;
    var projection = gameOptions.calculateResult({
      outcome: 'won',
      reason: 'flag',
      elapsedMs: elapsedMs,
      coinsCollected: score.coinScore,
      goombasKilled: goombasKilled,
      livesRemaining: score.lifeCount
    });

    score.updateMiniGame({
      elapsedMs: elapsedMs,
      coinsCollected: score.coinScore,
      goombasKilled: goombasKilled,
      livesRemaining: score.lifeCount,
      projectedScore: projection.score
    });
  };

  //Main Game Loop
  this.startGame = function(loopGeneration) {
    if (loopGeneration != animationGeneration) {
      return;
    }

    if (runState != 'running' && runState != 'finishing') {
      return;
    }

    if (isMiniGame && runState == 'running') {
      if (that.getElapsedMs() >= miniGameRules.timeLimitMs) {
        that.finalizeMiniGame('lost', 'time-limit');
        return;
      }

      that.updateMiniGameHud();
    }

    animationID = window.requestAnimationFrame(function() {
      that.startGame(loopGeneration);
    });

    gameUI.clear(translatedDist, 0, viewPort, height);

    if (instructionTick < (isMiniGame ? 360 : 1000)) {
      that.showInstructions(); //showing control instructions
      instructionTick++;
    }

    if (checkpointMessageTicks > 0) {
      gameUI.writeText('Checkpoint reached!', translatedDist + 30, cameraTop + 95);
      checkpointMessageTicks--;
    }

    that.renderMap();

    for (var i = 0; i < powerUps.length; i++) {
      that.keepPowerUpAwayFromPits(powerUps[i]);
      powerUps[i].draw();
      powerUps[i].update();
    }

    for (var i = 0; i < bullets.length; i++) {
      bullets[i].draw();
      bullets[i].update();
    }

    for (var i = 0; i < goombas.length; i++) {
      that.keepGoombaAwayFromPits(goombas[i]);
      goombas[i].draw();
      goombas[i].update();
    }

    that.cleanupEntities();

    if (runState == 'running') {
      that.checkPowerUpMarioCollision();
      that.checkBulletEnemyCollision();
      that.checkEnemyMarioCollision();
    }

    if (runState != 'running' && runState != 'finishing') {
      return;
    }

    mario.draw();
    that.updateMario();

    if (runState == 'running') {
      that.checkCheckpoint();
      that.wallCollision();
      marioInGround = mario.grounded; //for use with legacy flag sliding
    }
  };

  this.cleanupEntities = function() {
    var leftCleanupEdge = translatedDist - viewPort;
    var rightCleanupEdge = translatedDist + viewPort * 2;

    powerUps = powerUps.filter(function(powerUp) {
      return powerUp.y <= height + tileSize && powerUp.x >= leftCleanupEdge && powerUp.x <= rightCleanupEdge;
    });

    bullets = bullets.filter(function(bullet) {
      return bullet.y <= height + tileSize && bullet.x >= leftCleanupEdge && bullet.x <= rightCleanupEdge;
    });

    goombas = goombas.filter(function(goomba) {
      var finishedDeathAnimation = goomba.state == 'dead' && goomba.frame >= 4;
      var outsideUsefulArea = goomba.y > height + tileSize || goomba.x < leftCleanupEdge;
      return !finishedDeathAnimation && !outsideUsefulArea;
    });
  };

  this.keepPowerUpAwayFromPits = function(powerUp) {
    if (powerUp.type != 30 || !powerUp.velX) {
      return;
    }

    var movingRight = powerUp.velX > 0;
    var probeX = movingRight ? powerUp.x + powerUp.width + 2 : powerUp.x - 2;
    var probeColumn = Math.floor(probeX / tileSize);

    if (probeColumn < 0 || probeColumn >= map[14].length || map[14][probeColumn] == 0) {
      powerUp.velX *= -1;
    }
  };

  this.keepGoombaAwayFromPits = function(goomba) {
    if (goomba.state == 'dead' || goomba.state == 'deadFromBullet' || !goomba.velX) {
      return;
    }

    var movingRight = goomba.velX > 0;
    var probeX = movingRight ? goomba.x + goomba.width + 2 : goomba.x - 2;
    var probeColumn = Math.floor(probeX / tileSize);

    if (probeColumn < 0 || probeColumn >= map[14].length || map[14][probeColumn] == 0) {
      goomba.velX *= -1;
    }
  };

  this.showInstructions = function() {
    if (isMiniGame) {
      if (compactView) {
        gameUI.writeText('Reach the flag. 15 coins. Perfect: 90s.', 30, cameraTop + 30);
        gameUI.writeText('Use the Game Boy controls below.', 30, cameraTop + 60);
      } else {
        gameUI.writeText('Reach the flag. Collect 15 coins. Perfect time: 90 seconds.', 30, 30);
        gameUI.writeText('Arrows move | Shift runs | Space jumps | Ctrl shoots', 30, 60);
      }
    } else {
      gameUI.writeText('Controls: Arrow keys for direction, shift to run, ctrl for bullets', 30, 30);
      gameUI.writeText('Tip: Jumping while running makes you jump higher', 30, 60);
    }
  };

  this.renderMap = function() {
    //setting false each time the map renders so that elements fall off a platform and not hover around
    mario.grounded = false;

    for (var i = 0; i < powerUps.length; i++) {
      powerUps[i].grounded = false;
    }
    for (var i = 0; i < goombas.length; i++) {
      goombas[i].grounded = false;
    }

    var renderBuffer = 2;
    var firstVisibleColumn = Math.max(0, Math.floor(translatedDist / tileSize) - renderBuffer);
    var lastVisibleColumn = Math.min(map[0].length - 1, Math.ceil((translatedDist + viewPort) / tileSize) + renderBuffer);

    for (var row = 0; row < map.length; row++) {
      for (var column = firstVisibleColumn; column <= lastVisibleColumn; column++) {
        switch (map[row][column]) {
          case 1: //platform
            element.x = column * tileSize;
            element.y = row * tileSize;
            element.platform();
            element.draw();

            that.checkElementMarioCollision(element, row, column);
            that.checkElementPowerUpCollision(element);
            that.checkElementEnemyCollision(element);
            that.checkElementBulletCollision(element);
            break;

          case 2: //coinBox
            element.x = column * tileSize;
            element.y = row * tileSize;
            element.coinBox();
            element.draw();

            that.checkElementMarioCollision(element, row, column);
            that.checkElementPowerUpCollision(element);
            that.checkElementEnemyCollision(element);
            that.checkElementBulletCollision(element);
            break;

          case 3: //powerUp Box
            element.x = column * tileSize;
            element.y = row * tileSize;
            element.powerUpBox();
            element.draw();

            that.checkElementMarioCollision(element, row, column);
            that.checkElementPowerUpCollision(element);
            that.checkElementEnemyCollision(element);
            that.checkElementBulletCollision(element);
            break;

          case 4: //uselessBox
            element.x = column * tileSize;
            element.y = row * tileSize;
            element.uselessBox();
            element.draw();

            that.checkElementMarioCollision(element, row, column);
            that.checkElementPowerUpCollision(element);
            that.checkElementEnemyCollision(element);
            that.checkElementBulletCollision(element);
            break;

          case 5: //flagPole
            element.x = column * tileSize;
            element.y = row * tileSize;
            element.flagPole();
            element.draw();

            that.checkElementMarioCollision(element, row, column);
            break;

          case 6: //flag
            element.x = column * tileSize;
            element.y = row * tileSize;
            element.flag();
            element.draw();
            break;

          case 7: //pipeLeft
            element.x = column * tileSize;
            element.y = row * tileSize;
            element.pipeLeft();
            element.draw();

            that.checkElementMarioCollision(element, row, column);
            that.checkElementPowerUpCollision(element);
            that.checkElementEnemyCollision(element);
            that.checkElementBulletCollision(element);
            break;

          case 8: //pipeRight
            element.x = column * tileSize;
            element.y = row * tileSize;
            element.pipeRight();
            element.draw();

            that.checkElementMarioCollision(element, row, column);
            that.checkElementPowerUpCollision(element);
            that.checkElementEnemyCollision(element);
            that.checkElementBulletCollision(element);
            break;

          case 9: //pipeTopLeft
            element.x = column * tileSize;
            element.y = row * tileSize;
            element.pipeTopLeft();
            element.draw();

            that.checkElementMarioCollision(element, row, column);
            that.checkElementPowerUpCollision(element);
            that.checkElementEnemyCollision(element);
            that.checkElementBulletCollision(element);
            break;

          case 10: //pipeTopRight
            element.x = column * tileSize;
            element.y = row * tileSize;
            element.pipeTopRight();
            element.draw();

            that.checkElementMarioCollision(element, row, column);
            that.checkElementPowerUpCollision(element);
            that.checkElementEnemyCollision(element);
            that.checkElementBulletCollision(element);
            break;

          case 20: //goomba
            var enemy = new Enemy();
            enemy.x = column * tileSize;
            enemy.y = row * tileSize;
            enemy.spawnRow = row;
            enemy.spawnColumn = column;
            enemy.goomba();
            enemy.draw();

            goombas.push(enemy);
            map[row][column] = 0;
        }
      }
    }
  };

  this.collisionCheck = function(objA, objB) {
    // get the vectors to check against
    var vX = objA.x + objA.width / 2 - (objB.x + objB.width / 2);
    var vY = objA.y + objA.height / 2 - (objB.y + objB.height / 2);

    // add the half widths and half heights of the objects
    var hWidths = objA.width / 2 + objB.width / 2;
    var hHeights = objA.height / 2 + objB.height / 2;
    var collisionDirection = null;

    // if the x and y vector are less than the half width or half height, then we must be inside the object, causing a collision
    if (Math.abs(vX) < hWidths && Math.abs(vY) < hHeights) {
      // figures out on which side we are colliding (top, bottom, left, or right)
      var offsetX = hWidths - Math.abs(vX);
      var offsetY = hHeights - Math.abs(vY);

      if (offsetX >= offsetY) {
        if (vY > 0 && vY < 37) {
          collisionDirection = 't';
          if (objB.type != 5) {
            //if flagpole then pass through it
            objA.y += offsetY;
          }
        } else if (vY < 0) {
          collisionDirection = 'b';
          if (objB.type != 5) {
            //if flagpole then pass through it
            objA.y -= offsetY;
          }
        }
      } else {
        if (vX > 0) {
          collisionDirection = 'l';
          objA.x += offsetX;
        } else {
          collisionDirection = 'r';
          objA.x -= offsetX;
        }
      }
    }
    return collisionDirection;
  };

  this.checkElementMarioCollision = function(element, row, column) {
    if (runState == 'finishing') {
      return;
    }

    var collisionDirection = that.collisionCheck(mario, element);

    if (collisionDirection == 'l' || collisionDirection == 'r') {
      mario.velX = 0;
      mario.jumping = false;

      if (element.type == 5) {
        //flag pole
        that.levelFinish(collisionDirection, element.x);
      }
    } else if (collisionDirection == 'b') {
      if (element.type != 5) {
        //only if not flag pole
        mario.grounded = true;
        mario.jumping = false;
      }
    } else if (collisionDirection == 't') {
      if (element.type != 5) {
        mario.velY *= -1;
      }

      if (element.type == 3) {
        //PowerUp Box
        var powerUp = new PowerUp();

        //gives mushroom if mario is small, otherwise gives flower
        if (mario.type == 'small') {
          powerUp.mushroom(element.x, element.y, that.getPowerUpDirection(column));
          powerUps.push(powerUp);
        } else {
          powerUp.flower(element.x, element.y);
          powerUps.push(powerUp);
        }

        map[row][column] = 4; //sets to useless box after powerUp appears

        //sound when mushroom appears
        gameSound.play('powerUpAppear');
      }

      if (element.type == 11) {
        //Flower Box
        var powerUp = new PowerUp();
        powerUp.flower(element.x, element.y);
        powerUps.push(powerUp);

        map[row][column] = 4; //sets to useless box after powerUp appears

        //sound when flower appears
        gameSound.play('powerUpAppear');
      }

      if (element.type == 2) {
        //Coin Box
        score.coinScore++;

        if (isMiniGame) {
          collectedCoins.push({ row: row, column: column });
          that.updateMiniGameHud();
        } else {
          score.totalScore += 100;
          score.updateCoinScore();
          score.updateTotalScore();
        }
        map[row][column] = 4; //sets to useless box after coin appears

        //sound when coin block is hit
        gameSound.play('coin');
      }
    }
  };

  this.checkElementPowerUpCollision = function(element) {
    for (var i = 0; i < powerUps.length; i++) {
      var collisionDirection = that.collisionCheck(powerUps[i], element);

      if (collisionDirection == 'l' || collisionDirection == 'r') {
        powerUps[i].velX *= -1; //change direction if collision with any element from the sidr
      } else if (collisionDirection == 'b') {
        powerUps[i].grounded = true;
      }
    }
  };

  this.getPowerUpDirection = function(column) {
    var safetyDistance = 6;
    var rightIsSafe = true;
    var leftIsSafe = true;

    for (var distance = 1; distance <= safetyDistance; distance++) {
      if (!map[14][column + distance] || map[14][column + distance] == 0) {
        rightIsSafe = false;
      }

      if (column - distance < 0 || map[14][column - distance] == 0) {
        leftIsSafe = false;
      }
    }

    if (!rightIsSafe && leftIsSafe) {
      return -1;
    }

    return 1;
  };

  this.checkElementEnemyCollision = function(element) {
    for (var i = 0; i < goombas.length; i++) {
      if (goombas[i].state != 'deadFromBullet') {
        //so that goombas fall from the map when dead from bullet
        var collisionDirection = that.collisionCheck(goombas[i], element);

        if (collisionDirection == 'l' || collisionDirection == 'r') {
          goombas[i].velX *= -1;
        } else if (collisionDirection == 'b') {
          goombas[i].grounded = true;
        }
      }
    }
  };

  this.checkElementBulletCollision = function(element) {
    for (var i = 0; i < bullets.length; i++) {
      var collisionDirection = that.collisionCheck(bullets[i], element);

      if (collisionDirection == 'b') {
        //if collision is from bottom of the bullet, it is grounded, so that it can be bounced
        bullets[i].grounded = true;
      } else if (collisionDirection == 't' || collisionDirection == 'l' || collisionDirection == 'r') {
        bullets.splice(i, 1);
      }
    }
  };

  this.checkPowerUpMarioCollision = function() {
    for (var i = 0; i < powerUps.length; i++) {
      var collWithMario = that.collisionCheck(powerUps[i], mario);
      if (collWithMario) {
        if (powerUps[i].type == 30 && mario.type == 'small') {
          //mushroom
          mario.type = 'big';
        } else if (powerUps[i].type == 31) {
          //flower
          mario.type = 'fire';
        }
        powerUps.splice(i, 1);

        if (!isMiniGame) {
          score.totalScore += 1000;
          score.updateTotalScore();
        }

        //sound when mushroom appears
        gameSound.play('powerUp');
      }
    }
  };

  this.checkEnemyMarioCollision = function() {
    for (var i = 0; i < goombas.length; i++) {
      if (!mario.invulnerable && goombas[i].state != 'dead' && goombas[i].state != 'deadFromBullet') {
        //if mario is invulnerable or goombas state is dead, collision doesnt occur
        var collWithMario = that.collisionCheck(goombas[i], mario);

        if (collWithMario == 't') {
          //kill goombas if collision is from top
          goombas[i].state = 'dead';

          mario.velY = -mario.speed;
          that.awardEnemyKill(goombas[i]);

          //sound when enemy dies
          gameSound.play('killEnemy');
        } else if (collWithMario == 'r' || collWithMario == 'l' || collWithMario == 'b') {
          goombas[i].velX *= -1;

          if (mario.type == 'big') {
            mario.type = 'small';
            mario.invulnerable = true;
            collWithMario = undefined;

            //sound when mario powerDowns
            gameSound.play('powerDown');

            setTimeout(function() {
              mario.invulnerable = false;
            }, 1000);
          } else if (mario.type == 'fire') {
            mario.type = 'big';
            mario.invulnerable = true;

            collWithMario = undefined;

            //sound when mario powerDowns
            gameSound.play('powerDown');

            setTimeout(function() {
              mario.invulnerable = false;
            }, 1000);
          } else if (mario.type == 'small') {
            collWithMario = undefined;
            that.handleMarioDeath();
            break;
          }
        }
      }
    }
  };

  this.checkBulletEnemyCollision = function() {
    for (var i = 0; i < goombas.length; i++) {
      for (var j = 0; j < bullets.length; j++) {
        var collWithBullet = null;
        if (goombas[i] && goombas[i].state != 'dead' && goombas[i].state != 'deadFromBullet') {
          //check for collision only if goombas exist and is not dead
          collWithBullet = that.collisionCheck(goombas[i], bullets[j]);
        }

        if (collWithBullet) {
          bullets[j] = null;
          bullets.splice(j, 1);

          goombas[i].state = 'deadFromBullet';
          that.awardEnemyKill(goombas[i]);

          //sound when enemy dies
          gameSound.play('killEnemy');
        }
      }
    }
  };

  this.awardEnemyKill = function(goomba) {
    if (goomba.scoreAwarded) {
      return;
    }

    goomba.scoreAwarded = true;

    if (isMiniGame) {
      goombasKilled++;
      killedEnemies.push({ row: goomba.spawnRow, column: goomba.spawnColumn });
      that.updateMiniGameHud();
    } else {
      score.totalScore += 1000;
      score.updateTotalScore();
    }
  };

  this.wallCollision = function() {
    //for walls (vieport walls)
    if (mario.x >= maxWidth - mario.width) {
      mario.x = maxWidth - mario.width;
    } else if (mario.x <= translatedDist) {
      mario.x = translatedDist + 1;
    }

    //for ground (viewport ground)
    if (mario.y >= height) {
      that.handleMarioDeath();
    }
  };

  this.handleMarioDeath = function() {
    if (runState != 'running') {
      return;
    }

    runState = 'dying';
    that.pauseRunClock();
    that.pauseGame();
    keys = [];

    mario.frame = 13;
    score.lifeCount--;

    if (isMiniGame) {
      that.updateMiniGameHud();
    } else {
      score.updateLifeCount();
    }

    gameSound.play('marioDie');

    timeOutId = setTimeout(function() {
      if (score.lifeCount <= 0) {
        if (isMiniGame) {
          that.finalizeMiniGame('lost', 'no-lives');
        } else {
          that.gameOver();
        }
      } else {
        if (isMiniGame) {
          if (checkpoint) {
            score.coinScore = checkpoint.coinScore;
            collectedCoins = checkpoint.collectedCoins.slice();
            goombasKilled = checkpoint.goombasKilled;
            killedEnemies = checkpoint.killedEnemies.slice();
            checkpointMessageTicks = 120;
          } else {
            score.coinScore = 0;
            collectedCoins = [];
            goombasKilled = 0;
            killedEnemies = [];
          }
          that.resumeRunClock();
        }

        runState = 'running';
        that.loadLevel();
        that.updateMiniGameHud();
      }
    }, 3000);
  };

  this.checkCheckpoint = function() {
    if (
      isMiniGame &&
      !checkpoint &&
      runState == 'running' &&
      mario.x >= miniGameRules.checkpointColumn * tileSize &&
      mario.y < height
    ) {
      that.activateCheckpoint();
    }
  };

  this.activateCheckpoint = function() {
    if (!isMiniGame || checkpoint) {
      return;
    }

    checkpoint = {
      spawnX: miniGameRules.checkpointColumn * tileSize,
      coinScore: score.coinScore,
      collectedCoins: collectedCoins.slice(),
      goombasKilled: goombasKilled,
      killedEnemies: killedEnemies.slice()
    };
    checkpointMessageTicks = 180;
    gameSound.play('powerUp');
  };

  //controlling mario with key events
  this.updateMario = function() {
    var friction = 0.9;
    var gravity = 0.2;

    mario.checkMarioType();

    if (runState == 'finishing') {
      that.updateFinishAnimation();
      return;
    }

    if (keys[38] || keys[32]) {
      //up arrow
      if (!mario.jumping && mario.grounded) {
        mario.jumping = true;
        mario.grounded = false;
        mario.velY = -(mario.speed / 2 + 5.5);

        // mario sprite position
        if (mario.frame == 0 || mario.frame == 1) {
          mario.frame = 3; //right jump
        } else if (mario.frame == 8 || mario.frame == 9) {
          mario.frame = 2; //left jump
        }

        //sound when mario jumps
        gameSound.play('jump');
      }
    }

    if (keys[39]) {
      //right arrow
      that.checkMarioPos(); //if mario goes to the center of the screen, sidescroll the map

      if (mario.velX < mario.speed) {
        mario.velX++;
      }

      //mario sprite position
      if (!mario.jumping) {
        tickCounter += 1;

        if (tickCounter > maxTick / mario.speed) {
          tickCounter = 0;

          if (mario.frame != 1) {
            mario.frame = 1;
          } else {
            mario.frame = 0;
          }
        }
      }
    }

    if (keys[37]) {
      //left arrow
      if (mario.velX > -mario.speed) {
        mario.velX--;
      }

      //mario sprite position
      if (!mario.jumping) {
        tickCounter += 1;

        if (tickCounter > maxTick / mario.speed) {
          tickCounter = 0;

          if (mario.frame != 9) {
            mario.frame = 9;
          } else {
            mario.frame = 8;
          }
        }
      }
    }

    if (keys[16]) {
      //shift key
      mario.speed = 5.4;
    } else {
      mario.speed = 3.6;
    }

    if (keys[17] && mario.type == 'fire') {
      //ctrl key
      if (!bulletFlag) {
        bulletFlag = true;
        var bullet = new Bullet();
        if (mario.frame == 9 || mario.frame == 8 || mario.frame == 2) {
          var direction = -1;
        } else {
          var direction = 1;
        }
        bullet.init(mario.x, mario.y, direction);
        bullets.push(bullet);

        //bullet sound
        gameSound.play('bullet');

        setTimeout(function() {
          bulletFlag = false; //only lets mario fire bullet after 500ms
        }, 500);
      }
    }

    //velocity 0 sprite position
    if (mario.velX > 0 && mario.velX < 1 && !mario.jumping) {
      mario.frame = 0;
    } else if (mario.velX > -1 && mario.velX < 0 && !mario.jumping) {
      mario.frame = 8;
    }

    if (mario.grounded) {
      mario.velY = 0;

      //grounded sprite position
      if (mario.frame == 3) {
        mario.frame = 0; //looking right
      } else if (mario.frame == 2) {
        mario.frame = 8; //looking left
      }
    }

    //change mario position
    mario.velX *= friction;
    mario.velY += gravity;

    mario.x += mario.velX;
    mario.y += mario.velY;
  };

  this.checkMarioPos = function() {
    centerPos = translatedDist + viewPort / 2;

    //side scrolling as mario reaches center of the viewPort
    if (mario.x > centerPos && centerPos + viewPort / 2 < maxWidth) {
      gameUI.scrollWindow(-mario.speed, 0);
      translatedDist += mario.speed;
    }
  };

  this.levelFinish = function(collisionDirection, poleX) {
    if (isMiniGame) {
      if (runState == 'running') {
        that.beginMiniGameFinish(collisionDirection, poleX);
      }
      return;
    }

    //game finishes when mario slides the flagPole and collides with the ground
    if (collisionDirection == 'r') {
      mario.x += 10;
      mario.velY = 2;
      mario.frame = 11;
    } else if (collisionDirection == 'l') {
      mario.x -= 32;
      mario.velY = 2;
      mario.frame = 10;
    }

    if (marioInGround) {
      mario.x += 20;
      mario.frame = 10;
      tickCounter += 1;
      if (tickCounter > maxTick) {
        that.pauseGame();

        mario.x += 10;
        tickCounter = 0;
        mario.frame = 12;
        runState = isMiniGame ? 'finish-delay' : 'transition';

        //sound when stage clears
        gameSound.play('stageClear');

        timeOutId = setTimeout(function() {
          if (isMiniGame) {
            that.finalizeMiniGame('won', 'flag');
          } else {
            currentLevel++;
            if (originalMaps[currentLevel]) {
              runState = 'running';
              that.loadLevel();
              score.updateLevelNum(currentLevel);
            } else {
              that.gameOver();
            }
          }
        }, isMiniGame ? 1200 : 5000);
      }
    }
  };

  this.beginMiniGameFinish = function(collisionDirection, poleX) {
    frozenElapsedMs = that.getElapsedMs();
    runState = 'finishing';
    keys = [];
    mario.velX = 0;
    mario.velY = 0;
    mario.jumping = false;

    var startsLeftOfPole = collisionDirection == 'r';
    mario.x = startsLeftOfPole ? poleX - mario.width + 4 : poleX + tileSize - 4;
    mario.y = Math.min(mario.y, height - tileSize - mario.height);
    mario.frame = startsLeftOfPole ? 11 : 10;

    finishAnimation = {
      phase: 'slide',
      tick: 0,
      poleX: poleX,
      groundY: height - tileSize - mario.height,
      slideFrame: mario.frame
    };

    that.updateMiniGameHud();
    gameSound.play('stageClear');
  };

  this.updateFinishAnimation = function() {
    if (!finishAnimation || runState != 'finishing') {
      return;
    }

    if (finishAnimation.phase == 'slide') {
      mario.frame = finishAnimation.slideFrame;
      mario.y = Math.min(finishAnimation.groundY, mario.y + 3);

      if (mario.y >= finishAnimation.groundY) {
        finishAnimation.phase = 'dismount';
        finishAnimation.tick = 0;
        finishAnimation.startX = mario.x;
        finishAnimation.targetX = finishAnimation.poleX + tileSize + 4;
      }
      return;
    }

    if (finishAnimation.phase == 'dismount') {
      finishAnimation.tick++;
      var progress = Math.min(1, finishAnimation.tick / 12);
      var easedProgress = 1 - Math.pow(1 - progress, 3);

      mario.x = finishAnimation.startX + (finishAnimation.targetX - finishAnimation.startX) * easedProgress;
      mario.y = finishAnimation.groundY - Math.sin(progress * Math.PI) * 18;
      mario.frame = 10;

      if (progress >= 1) {
        finishAnimation.phase = 'victory';
        finishAnimation.tick = 0;
        mario.y = finishAnimation.groundY;
        mario.frame = 12;
      }
      return;
    }

    if (finishAnimation.phase == 'victory') {
      finishAnimation.tick++;
      mario.y = finishAnimation.groundY;
      mario.frame = 12;

      if (finishAnimation.tick >= 45) {
        finishAnimation.phase = 'walk';
        finishAnimation.tick = 0;
        finishAnimation.walkTargetX = Math.min(
          finishAnimation.poleX + tileSize + 60,
          maxWidth - mario.width
        );
      }
      return;
    }

    if (finishAnimation.phase == 'walk') {
      finishAnimation.tick++;
      mario.x = Math.min(finishAnimation.walkTargetX, mario.x + 2.5);
      mario.y = finishAnimation.groundY;
      mario.frame = finishAnimation.tick % 12 < 6 ? 0 : 1;

      if (mario.x >= finishAnimation.walkTargetX || finishAnimation.tick >= 30) {
        finishAnimation.phase = 'complete';
        mario.frame = 0;
        runState = 'finish-delay';
        that.pauseGame();

        timeOutId = setTimeout(function() {
          that.finalizeMiniGame('won', 'flag');
        }, 600);
      }
    }
  };

  this.pauseGame = function() {
    animationGeneration++;
    window.cancelAnimationFrame(animationID);
  };

  this.gameOver = function() {
    runState = 'lost';
    gameUI.hideControls();
    score.gameOverView();
    gameUI.makeBox(0, 0, maxWidth, height);
    gameUI.writeText('Game Over', centerPos - 80, height - 300);
    gameUI.writeText('Thanks For Playing', centerPos - 122, height / 2);
  };

  this.finalizeMiniGame = function(outcome, reason) {
    if (!isMiniGame || resultEmitted) {
      return;
    }

    var elapsedMs = reason == 'time-limit' ? miniGameRules.timeLimitMs : that.getElapsedMs();

    resultEmitted = true;
    runState = outcome;
    frozenElapsedMs = elapsedMs;
    pausedAt = 0;
    that.pauseGame();
    that.clearTimeOut();
    keys = [];
    gameUI.hideControls();

    var result = gameOptions.calculateResult({
      outcome: outcome,
      reason: reason,
      elapsedMs: elapsedMs,
      coinsCollected: score.coinScore,
      goombasKilled: goombasKilled,
      livesRemaining: score.lifeCount
    });

    score.updateMiniGame({
      elapsedMs: elapsedMs,
      coinsCollected: result.coinsCollected,
      goombasKilled: result.goombasKilled,
      livesRemaining: result.livesRemaining,
      projectedScore: result.score
    });
    score.showResult(result, {
      onReplay: gameOptions.onReplay,
      onMenu: gameOptions.onMenu
    });

    window.dispatchEvent(new CustomEvent('mario-maker:result', { detail: result }));
  };

  this.abandonGame = function() {
    if (!isMiniGame || resultEmitted || runState == 'idle') {
      return;
    }

    if (runState == 'finishing' || runState == 'finish-delay') {
      that.finalizeMiniGame('won', 'flag');
    } else {
      that.finalizeMiniGame('lost', 'abandoned');
    }
  };

  this.resetGame = function() {
    that.loadLevel();
  };

  this.clearInstances = function() {
    that.pauseGame();
    that.clearTimeOut();
    runState = 'idle';
    keys = [];
    mario = null;
    element = null;
    gameSound = null;
    finishAnimation = null;

    goombas = [];
    bullets = [];
    powerUps = [];
  };

  this.clearTimeOut = function() {
    clearTimeout(timeOutId);
    timeOutId = null;
  };

  this.removeGameScreen = function() {
    gameUI.hide();

    if (score) {
      score.hideScore();
    }
  };

  this.showGameScreen = function() {
    gameUI.show();
  };
}

if (typeof module != 'undefined' && module.exports) {
  module.exports = MarioGame;
}
