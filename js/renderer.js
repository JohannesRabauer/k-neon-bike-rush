/* renderer.js - Canvas rendering with neon effects + shared UI primitives */
(function (global) {
  'use strict';

  var GAP_THRESHOLD = 78;

  function Renderer(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(global.devicePixelRatio || 1, 2);
    this.camera = { x: 0, y: 0, zoom: 1, tx: 0, ty: 0 };
    this.stars = [];
    this.particles = [];
    this.trail = [];
    this.width = 0;
    this.height = 0;
    this.resize();
    this._makeStars();
  }

  Renderer.prototype.resize = function () {
    var c = this.canvas;
    this.width = global.innerWidth;
    this.height = global.innerHeight;
    c.width = Math.floor(this.width * this.dpr);
    c.height = Math.floor(this.height * this.dpr);
    c.style.width = this.width + 'px';
    c.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  Renderer.prototype._makeStars = function () {
    this.stars = [];
    for (var i = 0; i < 140; i++) {
      this.stars.push({
        x: Math.random(), y: Math.random(),
        r: Math.random() * 1.6 + 0.3,
        tw: Math.random() * Math.PI * 2,
        sp: 0.5 + Math.random() * 2
      });
    }
  };

  // ---------- Background ----------
  Renderer.prototype.drawBackground = function (time, scrollX) {
    var ctx = this.ctx, w = this.width, h = this.height;
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#05050f');
    g.addColorStop(0.48, '#10101d');
    g.addColorStop(0.82, '#1f1420');
    g.addColorStop(1, '#2a1b15');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Stars
    for (var i = 0; i < this.stars.length; i++) {
      var s = this.stars[i];
      var tw = 0.5 + 0.5 * Math.sin(time * 0.002 * s.sp + s.tw);
      var px = (s.x * w - (scrollX || 0) * 0.05) % w;
      if (px < 0) px += w;
      ctx.globalAlpha = 0.25 + tw * 0.6;
      ctx.fillStyle = '#bfe9ff';
      ctx.beginPath();
      ctx.arc(px, s.y * h * 0.85, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Background grid
    this._drawGrid(scrollX || 0);
  };

  Renderer.prototype._drawGrid = function (scrollX) {
    var ctx = this.ctx, w = this.width, h = this.height;
    var horizon = h * 0.62;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(80, 90, 200, 0.10)';
    var spacing = 46;
    var offset = (scrollX * 0.15) % spacing;
    for (var x = -offset; x < w; x += spacing) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    // perspective-ish horizontal lines fading toward horizon
    for (var i = 0; i < 12; i++) {
      var y = horizon + Math.pow(i / 12, 1.6) * (h - horizon);
      ctx.globalAlpha = 0.10 * (1 - i / 14);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  // ---------- World camera ----------
  Renderer.prototype.updateCamera = function (target, dt) {
    var zoom = clamp(this.height / 640, 0.55, 1.35);
    this.camera.zoom = zoom;
    var k = Math.min(1, dt * 0.006);
    this.camera.x += (target.x - this.camera.x) * k;
    this.camera.y += (target.y - this.camera.y) * k;
  };

  Renderer.prototype.snapCamera = function (target) {
    this.camera.x = target.x;
    this.camera.y = target.y;
    this.camera.zoom = clamp(this.height / 640, 0.55, 1.35);
  };

  Renderer.prototype.beginWorld = function () {
    var ctx = this.ctx, cam = this.camera;
    ctx.save();
    ctx.translate(this.width / 2, this.height * 0.60);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);
  };

  Renderer.prototype.endWorld = function () { this.ctx.restore(); };

  // ---------- Terrain ----------
  Renderer.prototype.drawTerrain = function (level) {
    var ctx = this.ctx;
    var pts = level.terrain;
    var color = level.color;
    var surface = level.surface || {};
    var bottom = level.groundY + 700;

    // Split into continuous runs (gaps break the run)
    var runs = [];
    var run = [pts[0]];
    for (var i = 1; i < pts.length; i++) {
      var dx = pts[i][0] - pts[i - 1][0];
      if (Math.abs(dx) > GAP_THRESHOLD) {
        runs.push(run); run = [pts[i]];
      } else run.push(pts[i]);
    }
    runs.push(run);

    for (var r = 0; r < runs.length; r++) {
      var rp = runs[r];
      if (rp.length < 2) continue;

      // Filled ground body under the line
      ctx.beginPath();
      ctx.moveTo(rp[0][0], rp[0][1]);
      for (var j = 1; j < rp.length; j++) ctx.lineTo(rp[j][0], rp[j][1]);
      ctx.lineTo(rp[rp.length - 1][0], bottom);
      ctx.lineTo(rp[0][0], bottom);
      ctx.closePath();
      var fg = ctx.createLinearGradient(0, level.groundY - 120, 0, bottom);
      fg.addColorStop(0, surface.sand || '#c49a62');
      fg.addColorStop(0.18, surface.dirt || '#775333');
      fg.addColorStop(1, surface.dirtDark || '#25180f');
      ctx.fillStyle = fg;
      ctx.fill();

      // Compacted dirt top with a subtle futuristic edge
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(rp[0][0], rp[0][1]);
      for (var k = 1; k < rp.length; k++) ctx.lineTo(rp[k][0], rp[k][1]);

      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(34,21,13,0.92)';
      ctx.lineWidth = 10;
      ctx.stroke();

      ctx.strokeStyle = surface.sand || '#c49a62';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.shadowBlur = 16;
      ctx.shadowColor = color;
      ctx.strokeStyle = Bikes.hexA(color, 0.55);
      ctx.lineWidth = 1.8;
      ctx.globalAlpha = 0.9;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      for (var s = 1; s < rp.length; s += 3) {
        ctx.fillStyle = surface.accent || '#8d653a';
        ctx.beginPath();
        ctx.arc(rp[s][0], rp[s][1] + 6, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  Renderer.prototype.drawDecorations = function (level, time) {
    var ctx = this.ctx;
    var decos = level.decorations || [];
    for (var i = 0; i < decos.length; i++) {
      var d = decos[i];
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.shadowBlur = 14;
      ctx.shadowColor = d.color;
      ctx.strokeStyle = d.color;
      ctx.fillStyle = Bikes.hexA(d.color, 0.08);
      if (d.type === 'pillar') {
        ctx.lineWidth = 3;
        ctx.strokeRect(d.x, d.y, 14, d.h);
        ctx.fillRect(d.x, d.y, 14, d.h);
      } else if (d.type === 'ring') {
        var pulse = 1 + 0.08 * Math.sin(time * 0.004 + d.x);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r * pulse, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(d.x - d.size, d.y);
        ctx.lineTo(d.x, d.y - d.size * 0.7);
        ctx.lineTo(d.x + d.size, d.y);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(40,24,16,0.45)';
      ctx.fillRect(d.x - 18, level.groundY + 8, 36, 8);
      ctx.restore();
    }
  };

  Renderer.prototype.drawFinish = function (level, time) {
    var ctx = this.ctx;
    var x = level.finishX;
    var topY = level.groundY - 220;
    var botY = level.groundY + 10;
    var pulse = 0.6 + 0.4 * Math.sin(time * 0.006);
    ctx.save();
    ctx.shadowBlur = 24;
    ctx.shadowColor = '#ffffff';
    // pole
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 + pulse * 0.5) + ')';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, topY); ctx.lineTo(x, botY); ctx.stroke();
    // checker flag
    var fw = 46, fh = 34, cells = 4, cs = fw / cells;
    for (var r = 0; r < cells; r++) {
      for (var c = 0; c < cells; c++) {
        ctx.fillStyle = ((r + c) % 2 === 0) ? 'rgba(255,255,255,0.92)' : 'rgba(255,215,0,0.85)';
        ctx.fillRect(x + c * cs, topY + r * (fh / cells), cs, fh / cells);
      }
    }
    ctx.shadowBlur = 30;
    ctx.strokeStyle = 'rgba(255,215,0,' + pulse + ')';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, topY, fw, fh);
    ctx.restore();
  };

  // ---------- Bike + effects ----------
  Renderer.prototype.drawBike = function (bikeIndex, rd, time) {
    var ctx = this.ctx;
    // Position at chassis, rotate by chassis angle; wheels drawn relative.
    ctx.save();
    ctx.translate(rd.chassis.x, rd.chassis.y);
    ctx.rotate(rd.chassis.angle);
    // chassis local space: wheels are ~22px below center in bike frame
    ctx.translate(0, 8);
    var pulse = 0.5 + 0.5 * Math.sin(time * 0.02);
    Bikes.draw(ctx, bikeIndex, {
      wheelBase: rd.wheelBase,
      wheelRadius: rd.wheelRadius,
      pulse: pulse * (rd.throttle > 0 ? 1 : 0.5),
      rearWheelAngle: rd.rear.angle - rd.chassis.angle,
      frontWheelAngle: rd.front.angle - rd.chassis.angle
    });
    ctx.restore();
  };

  Renderer.prototype.spawnExhaust = function (rd, color) {
    if (rd.throttle <= 0 || !rd.onGround) return;
    for (var i = 0; i < 2; i++) {
      this.particles.push({
        x: rd.rear.x, y: rd.rear.y + rd.wheelRadius * 0.5,
        vx: -1.5 - Math.random() * 2.5 - rd.speed * 0.1,
        vy: -Math.random() * 1.5,
        life: 1, decay: 0.03 + Math.random() * 0.03,
        size: 2 + Math.random() * 3,
        color: color
      });
    }
    // trail point
    this.trail.push({ x: rd.rear.x, y: rd.rear.y, life: 1, color: color });
    if (this.trail.length > 40) this.trail.shift();
  };

  Renderer.prototype.updateEffects = function () {
    var p = this.particles;
    for (var i = p.length - 1; i >= 0; i--) {
      p[i].x += p[i].vx; p[i].y += p[i].vy; p[i].vy += 0.12;
      p[i].life -= p[i].decay;
      if (p[i].life <= 0) p.splice(i, 1);
    }
    for (var j = this.trail.length - 1; j >= 0; j--) {
      this.trail[j].life -= 0.04;
      if (this.trail[j].life <= 0) this.trail.splice(j, 1);
    }
  };

  Renderer.prototype.drawEffects = function () {
    var ctx = this.ctx;
    // trail
    if (this.trail.length > 1) {
      ctx.save();
      ctx.lineCap = 'round';
      for (var t = 1; t < this.trail.length; t++) {
        var a = this.trail[t - 1], b = this.trail[t];
        ctx.globalAlpha = b.life * 0.5;
        ctx.strokeStyle = b.color;
        ctx.shadowBlur = 10; ctx.shadowColor = b.color;
        ctx.lineWidth = 3 * b.life;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      ctx.restore();
    }
    // particles
    ctx.save();
    for (var i = 0; i < this.particles.length; i++) {
      var pt = this.particles[i];
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.fillStyle = pt.color;
      ctx.shadowBlur = 12; ctx.shadowColor = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * pt.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  };

  Renderer.prototype.clearEffects = function () { this.particles = []; this.trail = []; };

  // ---------- HUD ----------
  Renderer.prototype.drawHUD = function (info) {
    var ctx = this.ctx, w = this.width;
    // Level name + number (top-left)
    this.neonText(info.levelName, 18, 34, 20, info.color, 'left');
    this.neonText('DIFFICULTY ' + info.difficulty, 18, 58, 12, '#8fd0ff', 'left');

    // Timer + coins (top-center)
    this.neonText(fmtTime(info.time), w / 2, 40, 26, '#ffffff', 'center');
    this.neonText('\u25C6 ' + info.coins, w / 2, 66, 15, '#ffee00', 'center');

    // Progress bar (top)
    var barW = Math.min(360, w - 320), bx = (w - barW) / 2, by = 78;
    if (w < 700) { barW = w - 200; bx = 100; by = 84; }
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    roundRectPath(ctx, bx, by, barW, 8, 4); ctx.stroke();
    ctx.fillStyle = info.color;
    ctx.shadowBlur = 12; ctx.shadowColor = info.color;
    roundRectPath(ctx, bx, by, Math.max(4, barW * info.progress), 8, 4); ctx.fill();
    ctx.restore();

    // Speed gauge (bottom-left arc)
    this._speedGauge(info.speed, info.maxSpeed, info.color);

    if (info.crashed) {
      this._banner('CRASHED', 'Press R / tap RESTART', '#ff003c');
    }
  };

  Renderer.prototype._speedGauge = function (speed, maxSpeed, color) {
    var ctx = this.ctx;
    var cx = 66, cy = this.height - 66, r = 42;
    var frac = clamp(speed / (maxSpeed || 12), 0, 1);
    ctx.save();
    ctx.lineCap = 'round';
    // track
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 2.25);
    ctx.stroke();
    // value
    ctx.strokeStyle = color;
    ctx.shadowBlur = 14; ctx.shadowColor = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 0.75 + frac * Math.PI * 1.5);
    ctx.stroke();
    ctx.restore();
    this.neonText(Math.round(speed * 8), cx, cy + 2, 20, '#ffffff', 'center');
    this.neonText('KM/H', cx, cy + 20, 9, '#8fd0ff', 'center');
  };

  Renderer.prototype._banner = function (title, sub, color) {
    var ctx = this.ctx, w = this.width, h = this.height;
    ctx.save();
    ctx.fillStyle = 'rgba(5,5,15,0.45)';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    this.neonText(title, w / 2, h / 2 - 8, 54, color, 'center');
    this.neonText(sub, w / 2, h / 2 + 34, 16, '#d8f6ff', 'center');
  };

  // ---------- Shared primitives (used by UI too) ----------
  Renderer.prototype.neonText = function (text, x, y, size, color, align, weight) {
    var ctx = this.ctx;
    ctx.save();
    ctx.font = (weight || '700') + ' ' + size + "px 'Orbitron', monospace";
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = size * 0.7;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.globalAlpha = 0.25;
    ctx.fillText(text, x, y);
    ctx.restore();
  };

  Renderer.prototype.drawButton = function (rect, label, color, opts) {
    opts = opts || {};
    var ctx = this.ctx;
    var disabled = opts.disabled;
    var active = opts.active;
    ctx.save();
    ctx.globalAlpha = disabled ? 0.35 : 1;
    ctx.fillStyle = active ? Bikes.hexA(color, 0.25) : 'rgba(8,10,24,0.6)';
    ctx.strokeStyle = color;
    ctx.lineWidth = active ? 3.5 : 2.5;
    ctx.shadowBlur = active ? 22 : 14;
    ctx.shadowColor = color;
    roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, opts.radius || 12);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    this.neonText(label, rect.x + rect.w / 2, rect.y + rect.h / 2, opts.fontSize || 18, color, 'center');
  };

  Renderer.prototype.roundRectPath = function (x, y, w, h, r) { roundRectPath(this.ctx, x, y, w, h, r); };

  // ---------- helpers ----------
  function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function fmtTime(t) {
    var m = Math.floor(t / 60), s = Math.floor(t % 60), ms = Math.floor((t * 100) % 100);
    return (m > 0 ? m + ':' : '') + (m > 0 ? pad2(s) : s) + '.' + pad2(ms);
  }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  Renderer.fmtTime = fmtTime;
  Renderer.clamp = clamp;
  global.Renderer = Renderer;
})(window);
