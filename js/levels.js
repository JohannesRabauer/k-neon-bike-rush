/* levels.js - Procedural generation of all 100 Neon Bike Rush levels */
(function (global) {
  'use strict';

  // Deterministic PRNG (mulberry32) so levels are identical every load.
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var GROUND_Y = 460;
  var STEP = 22; // horizontal spacing between terrain samples

  var ADJ = ['Neon', 'Cyber', 'Photon', 'Quantum', 'Vortex', 'Pulse', 'Chrome', 'Hyper',
             'Astral', 'Plasma', 'Turbo', 'Static', 'Prism', 'Volt', 'Nova', 'Digital',
             'Laser', 'Cosmic', 'Electric', 'Nitro'];
  var NOUN = ['Rush', 'Circuit', 'Descent', 'Ridge', 'Canyon', 'Skyline', 'Grid', 'Vector',
              'Loop', 'Drift', 'Highway', 'Abyss', 'Spire', 'Summit', 'Rift', 'Overdrive',
              'Sprint', 'Gauntlet', 'Horizon', 'Meltdown'];

  var COLORS = ['#00ff88', '#00ffff', '#ff00aa', '#bf00ff', '#ffee00', '#ff6a00', '#39ff14', '#ff2d55'];

  function levelName(id, rng) {
    var a = ADJ[Math.floor(rng() * ADJ.length)];
    var n = NOUN[Math.floor(rng() * NOUN.length)];
    return a + ' ' + n;
  }

  function difficultyFor(id) {
    // Map level 1..100 to difficulty 1..10 in bands.
    return Math.min(10, Math.max(1, Math.ceil(id / 10)));
  }

  // ---- Terrain feature builders. Each returns the new {x, y} cursor. ----

  function addFlat(pts, x, y, width) {
    var steps = Math.max(2, Math.round(width / STEP));
    for (var i = 1; i <= steps; i++) pts.push([x + (i / steps) * width, y]);
    return { x: x + width, y: y };
  }

  function addHills(pts, x, y, rng, diff) {
    var humps = 2 + Math.floor(rng() * 4);
    for (var h = 0; h < humps; h++) {
      var w = 120 + rng() * 130;
      var amp = 20 + diff * 5 + rng() * 30;
      var steps = Math.max(6, Math.round(w / STEP));
      for (var i = 1; i <= steps; i++) {
        var f = i / steps;
        pts.push([x + f * w, y - amp * Math.sin(Math.PI * f)]);
      }
      x += w;
    }
    return { x: x, y: y };
  }

  function addBumps(pts, x, y, rng, diff) {
    var count = 4 + Math.floor(rng() * 6);
    var w = 34 + rng() * 18;
    for (var i = 0; i < count; i++) {
      var amp = 8 + rng() * (10 + diff * 2);
      pts.push([x + w * 0.5, y - amp]);
      pts.push([x + w, y]);
      x += w;
    }
    return { x: x, y: y };
  }

  function addValley(pts, x, y, rng, diff) {
    var w = 200 + rng() * 160;
    var depth = 40 + diff * 6 + rng() * 40;
    var steps = Math.max(8, Math.round(w / STEP));
    for (var i = 1; i <= steps; i++) {
      var f = i / steps;
      pts.push([x + f * w, y + depth * Math.sin(Math.PI * f)]);
    }
    return { x: x + w, y: y };
  }

  function addPlateau(pts, x, y, rng, diff) {
    // ramp up, flat top, ramp/step down
    var dir = rng() < 0.5 ? -1 : 1;
    var h = (40 + diff * 8 + rng() * 40) * dir;
    var rampW = 90 + rng() * 60;
    var steps = Math.max(5, Math.round(rampW / STEP));
    for (var i = 1; i <= steps; i++) pts.push([x + (i / steps) * rampW, y - h * (i / steps)]);
    x += rampW; y -= h;
    var flat = 120 + rng() * 140;
    var r = addFlat(pts, x, y, flat);
    x = r.x;
    // clamp so we don't drift off screen
    y = Math.max(GROUND_Y - 260, Math.min(GROUND_Y + 120, y));
    return { x: x, y: y };
  }

  function addRampJump(pts, x, y, rng, diff) {
    // launch ramp -> gap -> landing (gap auto-detected by big horizontal distance)
    var rampW = 100 + rng() * 70;
    var rampH = 50 + diff * 9 + rng() * 45;
    var steps = Math.max(5, Math.round(rampW / STEP));
    for (var i = 1; i <= steps; i++) {
      var f = i / steps;
      pts.push([x + f * rampW, y - rampH * f]);
    }
    var topX = x + rampW, topY = y - rampH;
    var gapW = 110 + diff * 22 + rng() * 130;
    var landY = y + (rng() < 0.4 ? 30 : 0);
    // Landing ramp (downslope) for a smooth touchdown
    var landRamp = 70 + rng() * 50;
    pts.push([topX + gapW, landY]);
    var r = addFlat(pts, topX + gapW, landY, landRamp);
    return { x: r.x, y: landY };
  }

  function addGap(pts, x, y, rng, diff) {
    var pre = addFlat(pts, x, y, 60 + rng() * 40);
    var gapW = 90 + diff * 16 + rng() * 90;
    var landY = y;
    pts.push([pre.x + gapW, landY]);
    var post = addFlat(pts, pre.x + gapW, landY, 80);
    return { x: post.x, y: landY };
  }

  function addStairs(pts, x, y, rng, diff) {
    var count = 3 + Math.floor(rng() * 4);
    var dir = rng() < 0.5 ? -1 : 1;
    var stepH = 18 + diff * 3 + rng() * 14;
    var stepW = 60 + rng() * 40;
    for (var i = 0; i < count; i++) {
      y -= stepH * dir;
      y = Math.max(GROUND_Y - 260, Math.min(GROUND_Y + 120, y));
      var r = addFlat(pts, x, y, stepW);
      x = r.x;
    }
    return { x: x, y: y };
  }

  function addLoop(pts, x, y, rng, diff) {
    // A full loop-the-loop circle tangent to the current ground height.
    var R = 74 + diff * 4 + rng() * 24;
    var cx = x, cy = y - R;
    var startA = 90, endA = -270, dA = -14;
    for (var a = startA; a >= endA; a += dA) {
      var rad = a * Math.PI / 180;
      pts.push([cx + R * Math.cos(rad), cy + R * Math.sin(rad)]);
    }
    // exit continues at ground level just past the loop
    var r = addFlat(pts, x, y, 90 + rng() * 40);
    return { x: r.x, y: y };
  }

  function buildDecorations(pts, rng, color, diff) {
    var decos = [];
    var minX = pts[0][0], maxX = pts[pts.length - 1][0];
    var count = 6 + Math.floor(rng() * 8);
    for (var i = 0; i < count; i++) {
      var t = rng();
      var dx = minX + rng() * (maxX - minX);
      if (t < 0.4) {
        decos.push({ type: 'pillar', x: dx, y: GROUND_Y - 200 - rng() * 160, h: 200 + rng() * 220, color: color });
      } else if (t < 0.7) {
        decos.push({ type: 'ring', x: dx, y: GROUND_Y - 120 - rng() * 220, r: 30 + rng() * 60, color: color });
      } else {
        decos.push({ type: 'chevron', x: dx, y: GROUND_Y - 80 - rng() * 200, size: 20 + rng() * 30, color: color });
      }
    }
    return decos;
  }

  function generateLevel(id) {
    var rng = mulberry32(id * 2654435761 + 12345);
    var diff = difficultyFor(id);
    var color = COLORS[(id + diff) % COLORS.length];

    var pts = [];
    var startX = 260;
    var startY = GROUND_Y;

    // Start platform (flat runway)
    pts.push([-200, GROUND_Y]);
    var cur = addFlat(pts, -200, GROUND_Y, 640); // reaches x=440

    var targetLen = 2600 + diff * 200 + (id % 6) * 140;

    // Feature pool weighted by difficulty
    function pickFeature() {
      var pool = [];
      pool.push('hills', 'hills', 'bumps');
      if (diff >= 2) pool.push('valley', 'plateau');
      if (diff >= 3) pool.push('ramp', 'stairs');
      if (diff >= 4) pool.push('gap', 'ramp');
      if (diff >= 5) pool.push('loop', 'ramp', 'gap');
      if (diff >= 7) pool.push('loop', 'gap', 'ramp');
      return pool[Math.floor(rng() * pool.length)];
    }

    var guard = 0;
    while (cur.x < targetLen && guard < 400) {
      guard++;
      var f = pickFeature();
      if (f === 'hills') cur = addHills(pts, cur.x, cur.y, rng, diff);
      else if (f === 'bumps') cur = addBumps(pts, cur.x, cur.y, rng, diff);
      else if (f === 'valley') cur = addValley(pts, cur.x, cur.y, rng, diff);
      else if (f === 'plateau') cur = addPlateau(pts, cur.x, cur.y, rng, diff);
      else if (f === 'ramp') cur = addRampJump(pts, cur.x, cur.y, rng, diff);
      else if (f === 'gap') cur = addGap(pts, cur.x, cur.y, rng, diff);
      else if (f === 'stairs') cur = addStairs(pts, cur.x, cur.y, rng, diff);
      else if (f === 'loop') cur = addLoop(pts, cur.x, cur.y, rng, diff);
      // small connective flat
      cur = addFlat(pts, cur.x, cur.y, 40 + rng() * 40);
      cur.y = Math.max(GROUND_Y - 240, Math.min(GROUND_Y + 110, cur.y));
    }

    // Finish platform (flat run to finish)
    cur = addFlat(pts, cur.x, GROUND_Y, 360);
    var finishX = cur.x - 160;
    var finishY = GROUND_Y;

    var decorations = buildDecorations(pts, rng, color, diff);

    // Estimated par time for star rating (based on track length)
    var length = cur.x;
    var parTime = length / 300 + 6; // seconds

    return {
      id: id,
      name: id + '. ' + levelName(id, rng),
      difficulty: diff,
      terrain: pts,
      startX: startX,
      startY: startY - 40,
      finishX: finishX,
      finishY: finishY,
      color: color,
      decorations: decorations,
      parTime: parTime,
      coinsReward: 50 + diff * 18,
      groundY: GROUND_Y
    };
  }

  var cache = {};
  var Levels = {
    TOTAL: 100,
    GROUND_Y: GROUND_Y,
    get: function (id) {
      if (id < 1 || id > 100) return null;
      if (!cache[id]) cache[id] = generateLevel(id);
      return cache[id];
    },
    all: function () {
      var out = [];
      for (var i = 1; i <= 100; i++) out.push(this.get(i));
      return out;
    },
    // Star thresholds: 3 stars fast, 2 stars ok, 1 star finish
    computeStars: function (level, time) {
      if (time <= level.parTime * 0.75) return 3;
      if (time <= level.parTime * 1.15) return 2;
      return 1;
    }
  };

  global.Levels = Levels;
})(window);
