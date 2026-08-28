/* main.js - Game controller, state machine and main loop */
(function (global) {
  'use strict';

  var FIXED = 1000 / 60;

  var STATE = {
    MENU: 'MENU', GARAGE: 'GARAGE', SHOP: 'SHOP', LEVELS: 'LEVELS',
    PLAYING: 'PLAYING', COMPLETE: 'COMPLETE', GAMEOVER: 'GAMEOVER'
  };

  function Game() {
    this.canvas = document.getElementById('game-canvas');
    this.state = STATE.MENU;
    this.currentLevelId = 1;
    this.level = null;
    this.acc = 0;
    this.last = performance.now();
    this.crashStart = 0;
    this.handledEnd = false;

    Save.load();

    this.renderer = new Renderer(this.canvas);
    this.controls = new Controls(this.canvas);
    this.ui = new UI(this.renderer);
    this.engine = new GameEngine();

    this.hudRestart = document.getElementById('hud-restart');
    this.hudMenu = document.getElementById('hud-menu');

    this._wire();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  Game.prototype._wire = function () {
    var self = this;

    global.addEventListener('resize', function () { self.renderer.resize(); });

    this.controls.onRestart = function () {
      if (self.state === STATE.PLAYING || self.state === STATE.GAMEOVER || self.state === STATE.COMPLETE) {
        self.startLevel(self.currentLevelId);
      }
    };
    this.controls.onMenu = function () { self.setState(STATE.MENU); };
    this.controls.onPointerDown = function (x, y) {
      if (self.state !== STATE.PLAYING) self.ui.handlePointer(x, y);
    };

    this.hudRestart.addEventListener('click', function () { self.startLevel(self.currentLevelId); });
    this.hudMenu.addEventListener('click', function () { self.setState(STATE.MENU); });

    this.ui.onAction = function (action, data) { self._action(action, data); };
  };

  Game.prototype._action = function (action, data) {
    var self = this;
    switch (action) {
      case 'play':
        var next = Math.min(100, Save.countCompleted() + 1);
        this.startLevel(next);
        break;
      case 'garage': this.setState(STATE.GARAGE); break;
      case 'levels': this.setState(STATE.LEVELS); break;
      case 'menu': this.setState(STATE.MENU); break;
      case 'garagePrev':
        this.ui.garageIndex = (this.ui.garageIndex + Bikes.DEFS.length - 1) % Bikes.DEFS.length; break;
      case 'garageNext':
        this.ui.garageIndex = (this.ui.garageIndex + 1) % Bikes.DEFS.length; break;
      case 'selectBike':
        Save.setSelectedBike(this.ui.garageIndex); break;
      case 'openShop':
        this.ui.shopBikeIndex = this.ui.garageIndex; this.setState(STATE.SHOP); break;
      case 'buyUpgrade': this._buyUpgrade(data); break;
      case 'startLevel': this.startLevel(data); break;
      case 'nextLevel': this.startLevel(Math.min(100, this.currentLevelId + 1)); break;
      case 'retryLevel': this.startLevel(this.currentLevelId); break;
    }
  };

  Game.prototype._buyUpgrade = function (stat) {
    var idx = this.ui.shopBikeIndex;
    var up = Save.getUpgrades(idx);
    var lvl = up[stat];
    var cost = Bikes.upgradeCost(lvl);
    if (cost === null) return;
    if (Save.spendCoins(cost)) {
      Save.setUpgrade(idx, stat, lvl + 1);
    }
  };

  Game.prototype.setState = function (s) {
    this.state = s;
    var playing = (s === STATE.PLAYING);
    this.hudRestart.classList.toggle('hidden', !playing);
    this.hudMenu.classList.toggle('hidden', !playing);
    var showTouch = playing && this.controls.isTouchDevice();
    this.controls.showTouch(showTouch);
    if (!playing) this.controls.releaseAll();
  };

  Game.prototype.startLevel = function (id) {
    if (!global.Matter) { alert('Physics engine failed to load. Check your connection.'); return; }
    id = Math.max(1, Math.min(100, id));
    this.currentLevelId = id;
    this.ui.currentLevelId = id;
    this.level = Levels.get(id);
    var stats = Bikes.effectiveStats(Save.getSelectedBike());
    this.engine.loadLevel(this.level, stats);
    this.renderer.clearEffects();
    this.renderer.snapCamera(this.engine.getCameraTarget());
    this.crashStart = 0;
    this.handledEnd = false;
    this.setState(STATE.PLAYING);
  };

  Game.prototype._loop = function (now) {
    var dt = now - this.last;
    if (dt > 100) dt = 100;
    this.last = now;

    if (this.state === STATE.PLAYING) {
      this._updatePlaying(dt, now);
      this._renderPlaying(now);
    } else {
      this._renderScreen(now);
    }
    requestAnimationFrame(this._loop);
  };

  Game.prototype._updatePlaying = function (dt, now) {
    var input = this.controls.input;
    this.acc += dt;
    var steps = 0;
    while (this.acc >= FIXED && steps < 5) {
      this.engine.applyInput(input);
      this.engine.step(FIXED);
      this.acc -= FIXED;
      steps++;
    }

    var rd = this.engine.getRenderData();
    this.renderer.updateCamera({ x: rd.chassis.x, y: rd.chassis.y - 40 }, dt);
    this.renderer.spawnExhaust(rd, Bikes.get(Save.getSelectedBike()).glow);
    this.renderer.updateEffects();

    // Finish
    if (this.engine.finished && !this.handledEnd) {
      this.handledEnd = true;
      this._onFinish();
      return;
    }
    // Crash -> after short delay show game over
    if (this.engine.crashed) {
      if (!this.crashStart) this.crashStart = now;
      if (now - this.crashStart > 1400 && !this.handledEnd) {
        this.handledEnd = true;
        this._onCrash();
      }
    }
  };

  Game.prototype._onFinish = function () {
    var time = this.engine.elapsed;
    var stars = Levels.computeStars(this.level, time);
    var res = Save.completeLevel(this.level.id, stars, time, this.level.coinsReward);
    this.ui.lastResult = {
      stars: res.stars, time: time, reward: res.reward, firstTime: res.firstTime,
      levelName: this.level.name, color: this.level.color
    };
    this.setState(STATE.COMPLETE);
  };

  Game.prototype._onCrash = function () {
    this.ui.lastResult = { levelName: this.level.name, color: this.level.color };
    this.setState(STATE.GAMEOVER);
  };

  Game.prototype._renderPlaying = function (now) {
    var r = this.renderer, lvl = this.level;
    var rd = this.engine.getRenderData();

    r.drawBackground(now, r.camera.x);
    r.beginWorld();
    r.drawDecorations(lvl, now);
    r.drawTerrain(lvl);
    r.drawFinish(lvl, now);
    r.drawEffects();
    r.drawBike(Save.getSelectedBike(), rd, now);
    r.endWorld();

    r.drawHUD({
      levelName: lvl.name,
      difficulty: lvl.difficulty,
      color: lvl.color,
      time: this.engine.elapsed,
      coins: Save.getCoins(),
      progress: this.engine.getProgress(),
      speed: rd.speed,
      maxSpeed: 14,
      crashed: this.engine.crashed
    });
  };

  Game.prototype._renderScreen = function (now) {
    var ui = this.ui;
    ui.beginFrame();
    switch (this.state) {
      case STATE.MENU: ui.drawMenu(now); break;
      case STATE.GARAGE: ui.drawGarage(now); break;
      case STATE.SHOP: ui.drawShop(now); break;
      case STATE.LEVELS: ui.drawLevelSelect(now); break;
      case STATE.COMPLETE: ui.drawLevelComplete(now); break;
      case STATE.GAMEOVER: ui.drawGameOver(now); break;
      default: ui.drawMenu(now);
    }
  };

  // Boot
  function boot() { global.game = new Game(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
