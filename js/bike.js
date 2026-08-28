/* bike.js - Motorcycle definitions, stats, upgrades and canvas drawing */
(function (global) {
  'use strict';

  var UPGRADE_COSTS = [100, 250, 500, 1000, 2000];
  var MAX_UPGRADE = 5;
  var STAT_KEYS = ['acceleration', 'topSpeed', 'braking', 'jump', 'grip'];

  var DEFS = [
    {
      id: 0,
      name: 'Crimson Flash',
      style: 'aggressive',
      color: '#ff003c',
      glow: '#ff6680',
      desc: 'Aggressive angular racer with punchy acceleration.',
      stats: { acceleration: 1.15, topSpeed: 1.0, braking: 0.95, jump: 1.0, grip: 0.95 }
    },
    {
      id: 1,
      name: 'Teal Storm',
      style: 'aero',
      color: '#00ffff',
      glow: '#80ffff',
      desc: 'Sleek aerodynamic bike built for top speed.',
      stats: { acceleration: 1.0, topSpeed: 1.2, braking: 1.0, jump: 0.95, grip: 1.0 }
    },
    {
      id: 2,
      name: 'Violet Phantom',
      style: 'chopper',
      color: '#bf00ff',
      glow: '#df80ff',
      desc: 'Wide chopper with monster grip and heavy braking.',
      stats: { acceleration: 0.95, topSpeed: 0.95, braking: 1.2, jump: 0.95, grip: 1.2 }
    },
    {
      id: 3,
      name: 'Solar Blaze',
      style: 'sport',
      color: '#ffee00',
      glow: '#fff380',
      desc: 'Compact sporty bike that jumps sky-high.',
      stats: { acceleration: 1.05, topSpeed: 1.05, braking: 1.0, jump: 1.25, grip: 1.05 }
    }
  ];

  var Bikes = {
    DEFS: DEFS,
    STAT_KEYS: STAT_KEYS,
    UPGRADE_COSTS: UPGRADE_COSTS,
    MAX_UPGRADE: MAX_UPGRADE,

    get: function (i) { return DEFS[i]; },

    upgradeCost: function (currentLevel) {
      if (currentLevel >= MAX_UPGRADE) return null;
      return UPGRADE_COSTS[currentLevel];
    },

    // Effective stat = base * (1 + 0.12 * upgradeLevel)
    effectiveStats: function (bikeIndex) {
      var def = DEFS[bikeIndex];
      var up = global.Save.getUpgrades(bikeIndex);
      var out = {};
      STAT_KEYS.forEach(function (k) {
        out[k] = def.stats[k] * (1 + 0.12 * (up[k] || 0));
      });
      return out;
    },

    // ---------- Canvas drawing ----------
    // Draws bike centered at (0,0), facing right, chassis width ~ 90.
    // ctx should already be translated/rotated by the renderer. wheelBase in px.
    draw: function (ctx, bikeIndex, opts) {
      opts = opts || {};
      var def = DEFS[bikeIndex];
      var color = def.color, glow = def.glow;
      var wb = opts.wheelBase || 70;   // distance between wheels
      var wr = opts.wheelRadius || 18; // wheel radius
      var pulse = opts.pulse || 0;     // 0..1 engine glow pulse
      var frontAngle = opts.frontWheelAngle || 0;
      var rearAngle = opts.rearWheelAngle || 0;

      var xF = wb / 2, xR = -wb / 2, yW = wr; // wheel centers

      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      // Engine glow underneath
      var glowR = 26 + pulse * 10;
      var g = ctx.createRadialGradient(0, yW, 0, 0, yW, glowR);
      g.addColorStop(0, hexA(glow, 0.55));
      g.addColorStop(1, hexA(glow, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, yW - 2, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Wheels
      drawWheel(ctx, xR, yW, wr, color, glow, rearAngle);
      drawWheel(ctx, xF, yW, wr, color, glow, frontAngle);

      // Chassis body by style
      ctx.save();
      ctx.shadowBlur = 16;
      ctx.shadowColor = color;
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = color;
      ctx.fillStyle = hexA(color, 0.14);

      if (def.style === 'aggressive') drawAggressive(ctx, xF, xR, yW, wr);
      else if (def.style === 'aero') drawAero(ctx, xF, xR, yW, wr);
      else if (def.style === 'chopper') drawChopper(ctx, xF, xR, yW, wr);
      else drawSport(ctx, xF, xR, yW, wr);

      ctx.restore();

      // Rider silhouette
      drawRider(ctx, 0, yW, wr, glow);
    }
  };

  function drawWheel(ctx, cx, cy, r, color, glow, angle) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.shadowBlur = 14;
    ctx.shadowColor = glow;
    // Tire
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    // Hub
    ctx.shadowBlur = 8;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    // Spokes
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = hexA(glow, 0.8);
    for (var i = 0; i < 5; i++) {
      var a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawAggressive(ctx, xF, xR, yW, wr) {
    var top = yW - wr - 14;
    ctx.beginPath();
    ctx.moveTo(xR + 4, yW - 4);
    ctx.lineTo(xR + 10, top + 6);
    ctx.lineTo(-6, top - 6);
    ctx.lineTo(xF - 6, top + 2);
    ctx.lineTo(xF + 8, top + 12);
    ctx.lineTo(xF, yW - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // seat spike
    ctx.beginPath();
    ctx.moveTo(xR + 8, top + 4);
    ctx.lineTo(xR - 6, top - 4);
    ctx.lineTo(xR + 2, top + 8);
    ctx.stroke();
  }

  function drawAero(ctx, xF, xR, yW, wr) {
    var top = yW - wr - 12;
    ctx.beginPath();
    ctx.moveTo(xR, yW - 6);
    ctx.quadraticCurveTo(xR - 4, top, -2, top - 4);
    ctx.quadraticCurveTo(xF * 0.6, top - 8, xF + 10, top + 6);
    ctx.quadraticCurveTo(xF + 12, yW - 8, xF, yW - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // windscreen
    ctx.beginPath();
    ctx.moveTo(xF - 2, top - 2);
    ctx.lineTo(xF + 14, top - 8);
    ctx.stroke();
  }

  function drawChopper(ctx, xF, xR, yW, wr) {
    var top = yW - wr - 10;
    ctx.beginPath();
    ctx.moveTo(xR - 4, yW - 4);
    ctx.lineTo(xR + 6, top);
    ctx.lineTo(0, top - 2);
    ctx.lineTo(xF - 4, top);
    ctx.lineTo(xF + 16, top - 14); // long front fork
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(xR + 6, top);
    ctx.lineTo(xF - 4, top);
    ctx.lineTo(xF - 4, yW - 4);
    ctx.lineTo(xR - 4, yW - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function drawSport(ctx, xF, xR, yW, wr) {
    var top = yW - wr - 13;
    ctx.beginPath();
    ctx.moveTo(xR + 2, yW - 6);
    ctx.lineTo(xR + 8, top + 2);
    ctx.lineTo(-2, top - 2);
    ctx.lineTo(xF - 4, top);
    ctx.lineTo(xF + 6, top + 8);
    ctx.lineTo(xF - 2, yW - 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // little tail fin
    ctx.beginPath();
    ctx.moveTo(xR + 6, top + 2);
    ctx.lineTo(xR - 4, top - 6);
    ctx.stroke();
  }

  function drawRider(ctx, cx, yW, wr, glow) {
    var hip = yW - wr - 12;
    ctx.save();
    ctx.strokeStyle = glow;
    ctx.shadowBlur = 10;
    ctx.shadowColor = glow;
    ctx.lineWidth = 3;
    // torso
    ctx.beginPath();
    ctx.moveTo(cx - 6, hip);
    ctx.lineTo(cx + 6, hip - 16);
    ctx.stroke();
    // arm to handlebar
    ctx.beginPath();
    ctx.moveTo(cx + 6, hip - 16);
    ctx.lineTo(cx + 20, hip - 4);
    ctx.stroke();
    // head
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx + 8, hip - 22, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // hex + alpha helper -> rgba string
  function hexA(hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.substring(0, 2), 16);
    var g = parseInt(h.substring(2, 4), 16);
    var b = parseInt(h.substring(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  Bikes.hexA = hexA;
  global.Bikes = Bikes;
})(window);
