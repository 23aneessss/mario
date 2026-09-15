# mario-maker
Classic Mario Game with Level-Editor made using **plain Javascript and HTML5 canvas**.
You can create your own levels or play a scored, single-level mini-game.
Download the files and run index.html to play the game, 
or simply visit the following link.

http://pratishshr.github.io/mario-maker/

## Controls:

* Right-Arrow/ Left-Arrow : Move right/left,
* Space/Up-Arrow: Jump,
* Shift: Sprint,
* Ctrl: Bullets

## Level Editor:
* Click and drag the tiles and click on the element you want to put.
* Save the map, and go to the 'Created Levels' screen to play the game.

## Scored Mini-Game

The built-in challenge starts with three lives and has a 150-second limit. Reach the flag to win. A perfect run collects all 15 coins, loses no lives, and finishes within 90 seconds for 200 points.

Successful runs use this formula:

```text
max(1, 200 - missedCoins*5 - livesLost*25 - lateSeconds + goombasKilled*2)
```

Each defeated Goomba adds two points, but the final score can never exceed 200. Running out of lives, reaching the time limit, or abandoning the run scores zero. Editor-created levels retain the original arcade scoring behavior.

An automatic checkpoint activates at the beginning of the final section. Death after that point respawns Mario at the checkpoint, preserves the coins collected before it, and resets coins collected after it. Time and lives continue across the respawn.

Every completed run dispatches one `mario-maker:result` event on `window`. The event's `detail` includes the outcome, reason, score, elapsed time, coin and life totals, and the coin/life/time penalty breakdown.

Run the dependency-free scoring and map checks with:

```bash
node tests/mini-game.test.js
```
