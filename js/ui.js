/* ui.js - Menus, screens and shop (drawn on canvas, click hit-testing) */
(function (global) {
  'use strict';

  function UI(renderer) {
    this.r = renderer;
    this.buttons = [];
    this.onAction = null;      // function(action, data)
    this.garageIndex = Save.getSelectedBike();
    this.shopBikeIndex = Save.getSelectedBike();
    this.lastResult = null;    // for LEVEL_COMPLETE / GAME_OVER
    this.currentLevelId = 1;
  }

  UI.prototype._btn = function (rect, action, data) {
    this.buttons.push({ x: rect.x, y: rect.y, w: rect.w, h: rect.h, action: action, data: data });
  };

  UI.prototype.handlePointer = function (x, y) {
    // iterate topmost-last so later buttons win
    for (var i = this.buttons.length - 1; i >= 0; i--) {
      var b = this.buttons[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        if (this.onAction) this.onAction(b.action, b.data);
        return true;
      }
    }
    return false;
  };

  UI.prototype.beginFrame = function () { this.buttons = []; };

  UI.prototype.coinBar = function () {
    var r = this.r;
    r.neonText('\u25C6 ' + Save.getCoins(), r.width - 20, 32, 20, '#ffee00', 'right');
  };

  // ================= MAIN MENU =================
  UI.prototype.drawMenu = function (time) {
    var r = this.r, ctx = r.ctx, w = r.width, h = r.height;
    r.drawBackground(time, time * 0.05);

    // Animated title
    var pulse = 0.6 + 0.4 * Math.sin(time * 0.004);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var big = Math.min(72, w / 9);
    ctx.font = '900 ' + big + "px 'Orbitron', monospace";
    ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 30 * pulse;
    ctx.fillStyle = '#00ffff';
    ctx.fillText('NEON BIKE', w / 2, h * 0.24);
    ctx.shadowColor = '#ff00aa'; ctx.shadowBlur = 30 * pulse;
    ctx.fillStyle = '#ff2d9b';
    ctx.fillText('RUSH', w / 2, h * 0.24 + big * 1.05);
    ctx.restore();

    this.coinBar();

    var bw = Math.min(300, w * 0.7), bx = (w - bw) / 2;
    var by = h * 0.5, gap = 66;
    r.drawButton({ x: bx, y: by, w: bw, h: 52 }, '\u25B6 PLAY', '#00ff88', { fontSize: 22 });
    this._btn({ x: bx, y: by, w: bw, h: 52 }, 'play');

    r.drawButton({ x: bx, y: by + gap, w: bw, h: 52 }, 'GARAGE', '#00ffff', { fontSize: 20 });
    this._btn({ x: bx, y: by + gap, w: bw, h: 52 }, 'garage');

    r.drawButton({ x: bx, y: by + gap * 2, w: bw, h: 52 }, 'LEVELS', '#bf00ff', { fontSize: 20 });
    this._btn({ x: bx, y: by + gap * 2, w: bw, h: 52 }, 'levels');

    var completed = Save.countCompleted();
    r.neonText(completed + ' / 100 LEVELS COMPLETE', w / 2, by + gap * 3 + 6, 13, '#8fd0ff', 'center');

    r.neonText('\u2191 gas  \u00B7  \u2193 brake  \u00B7  \u2190/\u2192 tilt  \u00B7  Space jump  \u00B7  R restart', w / 2, h - 24, 12, '#5f7fb0', 'center');
  };

  // ================= BIKE SELECT / GARAGE =================
  UI.prototype.drawGarage = function (time) {
    var r = this.r, w = r.width, h = r.height;
    r.drawBackground(time, 0);
    r.neonText('GARAGE', w / 2, 46, 34, '#00ffff', 'center');
    this.coinBar();

    var def = Bikes.get(this.garageIndex);

    // Bike preview
    var cx = w / 2, cy = h * 0.34;
    var ctx = r.ctx;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1.7, 1.7);
    var pulse = 0.5 + 0.5 * Math.sin(time * 0.02);
    Bikes.draw(ctx, this.garageIndex, { wheelBase: 74, wheelRadius: 20, pulse: pulse });
    ctx.restore();

    r.neonText(def.name, cx, cy + 80, 26, def.color, 'center');
    r.neonText(def.desc, cx, cy + 108, 13, '#a9c7e6', 'center');

    // Prev / Next arrows
    r.drawButton({ x: cx - 170, y: cy - 20, w: 46, h: 46 }, '\u2039', def.color, { fontSize: 28 });
    this._btn({ x: cx - 170, y: cy - 20, w: 46, h: 46 }, 'garagePrev');
    r.drawButton({ x: cx + 124, y: cy - 20, w: 46, h: 46 }, '\u203A', def.color, { fontSize: 28 });
    this._btn({ x: cx + 124, y: cy - 20, w: 46, h: 46 }, 'garageNext');

    // Stats bars
    var stats = Bikes.effectiveStats(this.garageIndex);
    var sy = cy + 145;
    this._drawStatBars(stats, w / 2 - 150, sy, 300, def.color);

    // Buttons: Select, Upgrade, Back
    var selected = (Save.getSelectedBike() === this.garageIndex);
    var bw = 150, by = h - 76;
    r.drawButton({ x: w / 2 - bw - 8, y: by, w: bw, h: 48 }, selected ? '\u2713 SELECTED' : 'SELECT',
      selected ? '#00ff88' : '#ffffff', { active: selected });
    this._btn({ x: w / 2 - bw - 8, y: by, w: bw, h: 48 }, 'selectBike');

    r.drawButton({ x: w / 2 + 8, y: by, w: bw, h: 48 }, 'UPGRADE', '#ffee00', {});
    this._btn({ x: w / 2 + 8, y: by, w: bw, h: 48 }, 'openShop');

    r.drawButton({ x: 16, y: 24, w: 90, h: 40 }, '\u2039 BACK', '#8fd0ff', { fontSize: 14 });
    this._btn({ x: 16, y: 24, w: 90, h: 40 }, 'menu');
  };

  UI.prototype._drawStatBars = function (stats, x, y, w, color) {
    var r = this.r;
    var keys = Bikes.STAT_KEYS;
    var labels = { acceleration: 'ACCEL', topSpeed: 'SPEED', braking: 'BRAKE', jump: 'JUMP', grip: 'GRIP' };
    var rowH = 26;
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i], val = stats[k];
      var yy = y + i * rowH;
      r.neonText(labels[k], x, yy + 8, 12, '#a9c7e6', 'left');
      var barX = x + 74, barW = w - 74;
      var ctx = r.ctx;
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      r.roundRectPath(barX, yy, barW, 12, 6); ctx.fill();
      var frac = Math.max(0, Math.min(1, (val - 0.7) / (2.3 - 0.7)));
      ctx.fillStyle = color;
      ctx.shadowBlur = 10; ctx.shadowColor = color;
      r.roundRectPath(barX, yy, Math.max(6, barW * frac), 12, 6); ctx.fill();
      ctx.restore();
    }
  };

  // ================= UPGRADE SHOP =================
  UI.prototype.drawShop = function (time) {
    var r = this.r, w = r.width, h = r.height;
    r.drawBackground(time, 0);
    var idx = this.shopBikeIndex;
    var def = Bikes.get(idx);
    r.neonText('UPGRADE SHOP', w / 2, 46, 30, '#ffee00', 'center');
    r.neonText(def.name, w / 2, 78, 18, def.color, 'center');
    this.coinBar();

    var up = Save.getUpgrades(idx);
    var stats = Bikes.effectiveStats(idx);
    var keys = Bikes.STAT_KEYS;
    var labels = { acceleration: 'ACCELERATION', topSpeed: 'TOP SPEED', braking: 'BRAKING', jump: 'JUMP', grip: 'GRIP' };

    var x = Math.max(20, w / 2 - 230), colW = Math.min(460, w - 40);
    var y0 = 120, rowH = 74;
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var lvl = up[k];
      var yy = y0 + i * rowH;
      r.neonText(labels[k], x, yy, 15, '#d8f6ff', 'left');

      // pip bar (5 segments)
      var pipX = x, pipY = yy + 14, pipW = colW - 170, seg = pipW / Bikes.MAX_UPGRADE;
      var ctx = r.ctx;
      for (var p = 0; p < Bikes.MAX_UPGRADE; p++) {
        ctx.save();
        var filled = p < lvl;
        ctx.fillStyle = filled ? def.color : 'rgba(255,255,255,0.08)';
        if (filled) { ctx.shadowBlur = 10; ctx.shadowColor = def.color; }
        r.roundRectPath(pipX + p * seg + 2, pipY, seg - 6, 14, 4); ctx.fill();
        ctx.restore();
      }

      // cost + buy button
      var cost = Bikes.upgradeCost(lvl);
      var btnX = x + colW - 150, btnW = 150;
      if (cost === null) {
        r.drawButton({ x: btnX, y: yy - 6, w: btnW, h: 40 }, 'MAX', '#00ff88', { active: true, fontSize: 15 });
      } else {
        var afford = Save.getCoins() >= cost;
        r.drawButton({ x: btnX, y: yy - 6, w: btnW, h: 40 }, '\u25C6 ' + cost, afford ? '#ffee00' : '#ff6680',
          { disabled: !afford, fontSize: 15 });
        this._btn({ x: btnX, y: yy - 6, w: btnW, h: 40 }, 'buyUpgrade', k);
      }
    }

    r.drawButton({ x: 16, y: 24, w: 90, h: 40 }, '\u2039 BACK', '#8fd0ff', { fontSize: 14 });
    this._btn({ x: 16, y: 24, w: 90, h: 40 }, 'garage');
  };

  // ================= LEVEL SELECT =================
  UI.prototype.drawLevelSelect = function (time) {
    var r = this.r, w = r.width, h = r.height;
    r.drawBackground(time, 0);
    r.neonText('SELECT LEVEL', w / 2, 44, 28, '#bf00ff', 'center');
    this.coinBar();

    var cols = 10, rows = 10;
    var pad = 8;
    var areaW = Math.min(w - 24, 560);
    var cell = Math.floor((areaW - pad * (cols - 1)) / cols);
    var gridW = cell * cols + pad * (cols - 1);
    var startX = (w - gridW) / 2;
    var startY = 76;
    var ctx = r.ctx;

    for (var i = 0; i < 100; i++) {
      var id = i + 1;
      var cx = startX + (i % cols) * (cell + pad);
      var cy = startY + Math.floor(i / cols) * (cell + pad);
      var unlocked = Save.isLevelUnlocked(id);
      var result = Save.getLevelResult(id);
      var lvl = Levels.get(id);

      ctx.save();
      if (!unlocked) {
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.strokeStyle = 'rgba(140,150,190,0.25)';
        ctx.lineWidth = 1.5;
      } else {
        ctx.fillStyle = result ? Bikes.hexA(lvl.color, 0.18) : 'rgba(10,14,30,0.7)';
        ctx.strokeStyle = lvl.color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10; ctx.shadowColor = lvl.color;
      }
      r.roundRectPath(cx, cy, cell, cell, 6);
      ctx.fill(); ctx.stroke();
      ctx.restore();

      if (unlocked) {
        r.neonText('' + id, cx + cell / 2, cy + cell / 2 - (result ? 4 : 0),
          Math.max(11, cell * 0.34), unlocked ? '#ffffff' : '#666', 'center');
        if (result) {
          // stars
          var sSize = Math.max(5, cell * 0.10);
          var starY = cy + cell - sSize - 4;
          for (var s = 0; s < 3; s++) {
            var sx = cx + cell / 2 + (s - 1) * (sSize * 2.4);
            ctx.save();
            ctx.fillStyle = s < result.stars ? '#ffee00' : 'rgba(255,255,255,0.18)';
            if (s < result.stars) { ctx.shadowBlur = 8; ctx.shadowColor = '#ffee00'; }
            drawStar(ctx, sx, starY, sSize);
            ctx.restore();
          }
        }
        this._btn({ x: cx, y: cy, w: cell, h: cell }, 'startLevel', id);
      } else {
        r.neonText('\uD83D\uDD12', cx + cell / 2, cy + cell / 2, Math.max(10, cell * 0.3), '#8090b0', 'center');
      }
    }

    r.drawButton({ x: 16, y: 24, w: 90, h: 40 }, '\u2039 BACK', '#8fd0ff', { fontSize: 14 });
    this._btn({ x: 16, y: 24, w: 90, h: 40 }, 'menu');
  };

  // ================= LEVEL COMPLETE =================
  UI.prototype.drawLevelComplete = function (time) {
    var r = this.r, w = r.width, h = r.height;
    var res = this.lastResult || { stars: 1, time: 0, reward: 0 };
    r.drawBackground(time, 0);

    r.neonText('LEVEL COMPLETE', w / 2, h * 0.2, 34, '#00ff88', 'center');
    r.neonText(res.levelName || '', w / 2, h * 0.2 + 34, 16, res.color || '#fff', 'center');

    // Stars big
    var ctx = r.ctx;
    var sy = h * 0.38, ss = 34;
    for (var s = 0; s < 3; s++) {
      var sx = w / 2 + (s - 1) * (ss * 3);
      var earned = s < res.stars;
      var pulse = earned ? (1 + 0.12 * Math.sin(time * 0.006 + s)) : 1;
      ctx.save();
      ctx.fillStyle = earned ? '#ffee00' : 'rgba(255,255,255,0.15)';
      if (earned) { ctx.shadowBlur = 22; ctx.shadowColor = '#ffee00'; }
      drawStar(ctx, sx, sy, ss * pulse);
      ctx.restore();
    }

    r.neonText('TIME  ' + Renderer.fmtTime(res.time), w / 2, h * 0.55, 22, '#ffffff', 'center');
    r.neonText('\u25C6 +' + res.reward + (res.firstTime ? '' : ' (replay)'), w / 2, h * 0.55 + 32, 18, '#ffee00', 'center');

    var bw = Math.min(150, w * 0.4), by = h * 0.72;
    var hasNext = this.currentLevelId < 100;
    if (hasNext) {
      r.drawButton({ x: w / 2 - bw - 8, y: by, w: bw, h: 50 }, 'NEXT \u203A', '#00ff88', {});
      this._btn({ x: w / 2 - bw - 8, y: by, w: bw, h: 50 }, 'nextLevel');
      r.drawButton({ x: w / 2 + 8, y: by, w: bw, h: 50 }, 'RETRY', '#00ffff', {});
      this._btn({ x: w / 2 + 8, y: by, w: bw, h: 50 }, 'retryLevel');
    } else {
      r.drawButton({ x: w / 2 - bw / 2, y: by, w: bw, h: 50 }, 'RETRY', '#00ffff', {});
      this._btn({ x: w / 2 - bw / 2, y: by, w: bw, h: 50 }, 'retryLevel');
    }
    r.drawButton({ x: w / 2 - 75, y: by + 62, w: 150, h: 44 }, 'LEVELS', '#bf00ff', { fontSize: 15 });
    this._btn({ x: w / 2 - 75, y: by + 62, w: 150, h: 44 }, 'levels');
  };

  // ================= GAME OVER =================
  UI.prototype.drawGameOver = function (time) {
    var r = this.r, w = r.width, h = r.height;
    r.drawBackground(time, 0);
    r.neonText('CRASHED', w / 2, h * 0.34, 52, '#ff003c', 'center');
    r.neonText(this.lastResult ? this.lastResult.levelName : '', w / 2, h * 0.34 + 40, 16, '#ff6680', 'center');

    var bw = Math.min(200, w * 0.7);
    r.drawButton({ x: w / 2 - bw / 2, y: h * 0.55, w: bw, h: 54 }, '\u21BB RETRY', '#00ffff', { fontSize: 22 });
    this._btn({ x: w / 2 - bw / 2, y: h * 0.55, w: bw, h: 54 }, 'retryLevel');

    r.drawButton({ x: w / 2 - bw / 2, y: h * 0.55 + 68, w: bw, h: 48 }, 'LEVELS', '#bf00ff', { fontSize: 18 });
    this._btn({ x: w / 2 - bw / 2, y: h * 0.55 + 68, w: bw, h: 48 }, 'levels');
  };

  function drawStar(ctx, cx, cy, r) {
    ctx.beginPath();
    for (var i = 0; i < 5; i++) {
      var a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
      var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      var a2 = a + Math.PI / 5;
      ctx.lineTo(cx + Math.cos(a2) * r * 0.45, cy + Math.sin(a2) * r * 0.45);
    }
    ctx.closePath();
    ctx.fill();
  }

  global.UI = UI;
})(window);
