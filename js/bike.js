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
      style: 'streetfighter',
      color: '#ff003c',
      glow: '#ff6680',
      metal: '#aab3c7',
      seat: '#121524',
      desc: 'Streetfighter with a compact frame and hard acceleration.',
      stats: { acceleration: 1.15, topSpeed: 1.0, braking: 0.95, jump: 1.0, grip: 0.95 },
      geometry: { tailLift: 9, tankLength: 23, noseReach: 15, forkRake: 1.0, seatDrop: 2 }
    },
    {
      id: 1,
      name: 'Teal Storm',
      style: 'superbike',
      color: '#00ffff',
      glow: '#80ffff',
      metal: '#c3d1dd',
      seat: '#0f1520',
      desc: 'Low superbike with long fairings built for high-speed stability.',
      stats: { acceleration: 1.0, topSpeed: 1.2, braking: 1.0, jump: 0.95, grip: 1.0 },
      geometry: { tailLift: 7, tankLength: 27, noseReach: 19, forkRake: 1.15, seatDrop: 0 }
    },
    {
      id: 2,
      name: 'Violet Phantom',
      style: 'scrambler',
      color: '#bf00ff',
      glow: '#df80ff',
      metal: '#b7afc8',
      seat: '#171322',
      desc: 'Tall scrambler with longer suspension and heavy grip.',
      stats: { acceleration: 0.95, topSpeed: 0.95, braking: 1.2, jump: 0.95, grip: 1.2 },
      geometry: { tailLift: 11, tankLength: 21, noseReach: 12, forkRake: 0.92, seatDrop: -2 }
    },
    {
      id: 3,
      name: 'Solar Blaze',
      style: 'hyperbike',
      color: '#ffee00',
      glow: '#fff380',
      metal: '#d5ca8d',
      seat: '#19160e',
      desc: 'Futuristic hyperbike with agile geometry and huge jump energy.',
      stats: { acceleration: 1.05, topSpeed: 1.05, braking: 1.0, jump: 1.25, grip: 1.05 },
      geometry: { tailLift: 8, tankLength: 25, noseReach: 18, forkRake: 1.05, seatDrop: 1 }
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

    effectiveStats: function (bikeIndex) {
      var def = DEFS[bikeIndex];
      var up = global.Save.getUpgrades(bikeIndex);
      var out = {};
      STAT_KEYS.forEach(function (k) {
        out[k] = def.stats[k] * (1 + 0.12 * (up[k] || 0));
      });
      return out;
    },

    draw: function (ctx, bikeIndex, opts) {
      opts = opts || {};
      var def = DEFS[bikeIndex];
      var geo = def.geometry || {};
      var color = def.color;
      var glow = def.glow;
      var metal = def.metal || '#b8c0cf';
      var seat = def.seat || '#11151f';
      var wb = opts.wheelBase || 70;
      var wr = opts.wheelRadius || 18;
      var pulse = opts.pulse || 0;
      var frontAngle = opts.frontWheelAngle || 0;
      var rearAngle = opts.rearWheelAngle || 0;

      var xF = wb / 2;
      var xR = -wb / 2;
      var yW = wr;
      var top = yW - wr - 16 + (geo.seatDrop || 0);
      var seatY = top - 1;
      var tankY = top - 7;
      var headX = xF - 6;
      var engineY = yW - 12;
      var pulseMix = 0.18 + pulse * 0.35;

      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      drawBikeGlow(ctx, 0, yW - 2, 24 + pulse * 8, glow);
      drawWheel(ctx, xR, yW, wr, color, glow, rearAngle, metal);
      drawWheel(ctx, xF, yW, wr, color, glow, frontAngle, metal);
      drawSuspension(ctx, xR, yW, headX, top + 6, metal, glow, 0.92);
      drawSuspension(ctx, xF, yW, headX + geo.noseReach, tankY + 2, metal, glow, geo.forkRake || 1);
      drawFrame(ctx, xR, xF, yW, top, tankY, headX, engineY, color, glow, metal, geo);
      drawBodywork(ctx, xR, xF, seatY, tankY, color, glow, metal, seat, geo, pulseMix);
      drawEngine(ctx, 0, engineY, color, glow, metal);
      drawExhaust(ctx, xR, yW, seatY, metal, color, geo);
      drawHandlebar(ctx, headX + geo.noseReach, tankY - 2, color, glow, metal);
    }
  };

  function drawBikeGlow(ctx, x, y, r, glow) {
    ctx.save();
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexA(glow, 0.42));
    g.addColorStop(1, hexA(glow, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawWheel(ctx, cx, cy, r, color, glow, angle, metal) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    ctx.fillStyle = '#13161f';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = Math.max(3, r * 0.25);
    ctx.strokeStyle = '#090b11';
    ctx.beginPath();
    ctx.arc(0, 0, r - ctx.lineWidth * 0.25, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 12;
    ctx.shadowColor = glow;
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, r - 3.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = metal;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4e5667';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = hexA('#ffffff', 0.38);
    ctx.lineWidth = 1.2;
    for (var i = 0; i < 6; i++) {
      var a = angle * 0.18 + (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.18, Math.sin(a) * r * 0.18);
      ctx.lineTo(Math.cos(a) * r * 0.56, Math.sin(a) * r * 0.56);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawSuspension(ctx, wheelX, wheelY, topX, topY, metal, glow, rake) {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = glow;
    ctx.strokeStyle = metal;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.lineTo(wheelX + (topX - wheelX) * 0.22 * rake, wheelY - 5);
    ctx.stroke();
    ctx.strokeStyle = '#636d82';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(topX + 3, topY + 1);
    ctx.lineTo(wheelX + (topX - wheelX) * 0.34 * rake, wheelY - 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawFrame(ctx, xR, xF, yW, top, tankY, headX, engineY, color, glow, metal, geo) {
    var seatX = xR + 18;
    var pivotX = -4;
    ctx.save();
    ctx.shadowBlur = 14;
    ctx.shadowColor = glow;
    ctx.lineWidth = 3.4;
    ctx.strokeStyle = color;
    ctx.fillStyle = hexA(color, 0.16);

    ctx.beginPath();
    ctx.moveTo(xR + 6, yW - 2);
    ctx.lineTo(seatX, top + 8);
    ctx.lineTo(headX + geo.tankLength, tankY + 2);
    ctx.lineTo(xF - 2, yW - 2);
    ctx.lineTo(pivotX, engineY + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = metal;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(xR + 3, yW - 1);
    ctx.lineTo(pivotX, engineY + 6);
    ctx.lineTo(headX + 10, tankY + 3);
    ctx.lineTo(headX + geo.tankLength, tankY + 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pivotX, engineY + 6);
    ctx.lineTo(xF - 6, yW - 1);
    ctx.stroke();
    ctx.restore();
  }

  function drawBodywork(ctx, xR, xF, seatY, tankY, color, glow, metal, seat, geo, pulseMix) {
    var seatStart = xR + 10;
    var seatEnd = seatStart + 28;
    var tankFront = xF - 6;
    ctx.save();

    ctx.fillStyle = seat;
    ctx.beginPath();
    ctx.moveTo(seatStart, seatY + 3);
    ctx.quadraticCurveTo(seatStart + 11, seatY - geo.tailLift, seatEnd, seatY + 1);
    ctx.lineTo(seatEnd - 1, seatY + 8);
    ctx.quadraticCurveTo(seatStart + 10, seatY + 7, seatStart - 3, seatY + 8);
    ctx.closePath();
    ctx.fill();

    var tankGrad = ctx.createLinearGradient(0, tankY - 8, 0, tankY + 18);
    tankGrad.addColorStop(0, hexA('#ffffff', pulseMix));
    tankGrad.addColorStop(0.3, hexA(color, 0.9));
    tankGrad.addColorStop(1, hexA(color, 0.34));
    ctx.fillStyle = tankGrad;
    ctx.shadowBlur = 16;
    ctx.shadowColor = glow;
    ctx.beginPath();
    ctx.moveTo(seatEnd - 4, seatY + 4);
    ctx.quadraticCurveTo(seatEnd + 6, tankY - 2, tankFront - geo.noseReach, tankY + 2);
    ctx.quadraticCurveTo(tankFront + 2, tankY + 12, seatEnd + 8, seatY + 10);
    ctx.quadraticCurveTo(seatEnd, seatY + 9, seatEnd - 4, seatY + 4);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = metal;
    ctx.beginPath();
    ctx.moveTo(xF - 10, tankY + 3);
    ctx.lineTo(xF + geo.noseReach - 2, tankY + 8);
    ctx.lineTo(xF + geo.noseReach - 9, tankY + 15);
    ctx.lineTo(xF - 6, tankY + 13);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0d1018';
    ctx.beginPath();
    ctx.moveTo(xF + geo.noseReach - 12, tankY + 8);
    ctx.lineTo(xF + geo.noseReach - 3, tankY + 9);
    ctx.lineTo(xF + geo.noseReach - 9, tankY + 13);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = hexA('#ffffff', 0.4);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(seatEnd + 2, tankY + 1);
    ctx.quadraticCurveTo(xF - 6, tankY - 5, tankFront - geo.noseReach + 3, tankY + 3);
    ctx.stroke();
    ctx.restore();
  }

  function drawEngine(ctx, x, y, color, glow, metal) {
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = glow;
    ctx.fillStyle = '#161a23';
    roundRect(ctx, x - 14, y - 11, 28, 22, 6);
    ctx.fill();

    ctx.fillStyle = '#2f3645';
    roundRect(ctx, x - 10, y - 7, 20, 14, 4);
    ctx.fill();

    ctx.strokeStyle = metal;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 2);
    ctx.lineTo(x + 8, y - 2);
    ctx.moveTo(x - 8, y + 2);
    ctx.lineTo(x + 8, y + 2);
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 12, y + 10);
    ctx.lineTo(x + 12, y + 10);
    ctx.stroke();
    ctx.restore();
  }

  function drawExhaust(ctx, xR, yW, seatY, metal, color, geo) {
    ctx.save();
    ctx.strokeStyle = metal;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-2, yW + 2);
    ctx.quadraticCurveTo(xR + 6, yW + 8, xR - 4, seatY + 14);
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xR - 6, seatY + 14);
    ctx.lineTo(xR + 4, seatY + 12 - geo.tailLift * 0.2);
    ctx.stroke();
    ctx.restore();
  }

  function drawHandlebar(ctx, x, y, color, glow, metal) {
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = glow;
    ctx.strokeStyle = metal;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 2);
    ctx.lineTo(x + 6, y - 5);
    ctx.lineTo(x + 11, y - 2);
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x + 4, y - 5);
    ctx.lineTo(x + 11, y - 2);
    ctx.stroke();
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

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
