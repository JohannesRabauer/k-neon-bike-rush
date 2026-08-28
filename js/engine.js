/* engine.js - Matter.js physics wrapper for the bike and terrain */
(function (global) {
  'use strict';

  var M = global.Matter;

  function GameEngine() {
    this.engine = null;
    this.world = null;
    this.level = null;
    this.stats = null;

    this.chassis = null;
    this.rearWheel = null;
    this.frontWheel = null;
    this.constraints = [];
    this.terrainBodies = [];

    this.wheelBase = 62;
    this.wheelRadius = 18;

    this.onGroundCount = 0;
    this.crashed = false;
    this.finished = false;
    this.startTime = 0;
    this.elapsed = 0;
    this.worldBottom = 0;
    this.throttle = 0; // -1..1 visual

    this._collisionHandlersBound = false;
  }

  GameEngine.prototype.loadLevel = function (level, stats) {
    this.level = level;
    this.stats = stats;
    this.crashed = false;
    this.finished = false;
    this.elapsed = 0;
    this.startTime = performance.now();
    this.worldBottom = level.groundY + 620;

    // Fresh engine
    this.engine = M.Engine.create();
    this.world = this.engine.world;
    this.engine.gravity.y = 1;
    this.engine.gravity.scale = 0.0016;

    this._buildTerrain(level);
    this._buildBike(level.startX, level.startY);
    this._bindCollisions();

    return this;
  };

  GameEngine.prototype._buildTerrain = function (level) {
    this.terrainBodies = [];
    var pts = level.terrain;
    var THICK = 24;
    var GAP_THRESHOLD = 78; // horizontal jump larger than this = real gap (no ground)
    var bodies = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1];
      var dx = b[0] - a[0], dy = b[1] - a[1];
      var len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.5) continue;
      if (Math.abs(dx) > GAP_THRESHOLD) continue; // leave a gap
      var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      var angle = Math.atan2(dy, dx);
      // Downward normal to the segment = (-sin, cos). Offset the rectangle
      // center by THICK/2 so its top edge lies exactly on the terrain line.
      var seg = M.Bodies.rectangle(
        mx - Math.sin(angle) * (THICK / 2),
        my + Math.cos(angle) * (THICK / 2),
        len + 3, THICK,
        {
          isStatic: true,
          angle: angle,
          friction: 1,
          label: 'terrain'
        }
      );
      bodies.push(seg);
    }
    // Left wall so bike can't fall off the back of the start
    var wall = M.Bodies.rectangle(pts[0][0] - 30, level.groundY - 200, 20, 800, {
      isStatic: true, label: 'terrain', friction: 0.2
    });
    bodies.push(wall);

    this.terrainBodies = bodies;
    M.Composite.add(this.world, bodies);
  };

  GameEngine.prototype._buildBike = function (x, y) {
    var group = M.Body.nextGroup(true); // negative group: parts never collide each other
    var filter = { group: group, category: 0x0001, mask: 0xFFFFFFFF };
    var wb = this.wheelBase, wr = this.wheelRadius;
    var grip = this.stats.grip;

    var chassis = M.Bodies.rectangle(x, y, 58, 14, {
      density: 0.004,
      friction: 0.4,
      frictionAir: 0.008,
      collisionFilter: filter,
      label: 'chassis',
      chamfer: { radius: 4 }
    });

    var wheelOpts = function () {
      return {
        density: 0.006,
        friction: 1.4 * grip,
        frictionStatic: 4 * grip,
        frictionAir: 0.008,
        restitution: 0.05,
        collisionFilter: filter,
        label: 'wheel'
      };
    };

    var rear = M.Bodies.circle(x - wb / 2, y + 22, wr, wheelOpts());
    var front = M.Bodies.circle(x + wb / 2, y + 22, wr, wheelOpts());

    this.chassis = chassis;
    this.rearWheel = rear;
    this.frontWheel = front;

    // Two constraints per wheel triangulate the wheel center to the chassis,
    // holding position while letting the wheel spin freely (rigid axle).
    var cons = [];
    cons.push(this._axle(chassis, -wb / 2 - 8, 6, rear));
    cons.push(this._axle(chassis, -wb / 2 + 8, 6, rear));
    cons.push(this._axle(chassis, wb / 2 - 8, 6, front));
    cons.push(this._axle(chassis, wb / 2 + 8, 6, front));
    this.constraints = cons;

    M.Composite.add(this.world, [chassis, rear, front].concat(cons));
  };

  GameEngine.prototype._axle = function (chassis, ax, ay, wheel) {
    return M.Constraint.create({
      bodyA: chassis,
      pointA: { x: ax, y: ay },
      bodyB: wheel,
      pointB: { x: 0, y: 0 },
      stiffness: 0.85,
      damping: 0.2
    });
  };

  GameEngine.prototype._bindCollisions = function () {
    var self = this;
    this.onGroundCount = 0;

    var isWheelTerrain = function (pair) {
      var a = pair.bodyA.label, b = pair.bodyB.label;
      return (a === 'wheel' && b === 'terrain') || (a === 'terrain' && b === 'wheel');
    };
    var isChassisTerrain = function (pair) {
      var a = pair.bodyA.label, b = pair.bodyB.label;
      return (a === 'chassis' && b === 'terrain') || (a === 'terrain' && b === 'chassis');
    };

    M.Events.on(this.engine, 'collisionStart', function (ev) {
      for (var i = 0; i < ev.pairs.length; i++) {
        var p = ev.pairs[i];
        if (isWheelTerrain(p)) self.onGroundCount++;
        if (isChassisTerrain(p)) self.crashed = true;
      }
    });
    M.Events.on(this.engine, 'collisionEnd', function (ev) {
      for (var i = 0; i < ev.pairs.length; i++) {
        if (isWheelTerrain(ev.pairs[i])) self.onGroundCount = Math.max(0, self.onGroundCount - 1);
      }
    });
  };

  GameEngine.prototype.isOnGround = function () { return this.onGroundCount > 0; };

  // Apply player input for this physics step.
  GameEngine.prototype.applyInput = function (input) {
    if (this.crashed || this.finished) { this.throttle = 0; return; }
    var s = this.stats;
    var onGround = this.isOnGround();

    // Drive (rear wheel spin) ---------------------------------------
    var maxSpin = 0.62 * s.topSpeed;
    if (input.gas) {
      var target = maxSpin;
      var accelStep = 0.05 * s.acceleration;
      if (this.rearWheel.angularVelocity < target) {
        M.Body.setAngularVelocity(this.rearWheel, Math.min(target, this.rearWheel.angularVelocity + accelStep));
      }
      if (onGround) {
        // small chassis assist for climbing steep hills
        var f = 0.0016 * s.acceleration * this.chassis.mass;
        M.Body.applyForce(this.chassis, this.chassis.position, { x: f, y: 0 });
      }
      this.throttle = 1;
    } else if (input.brake) {
      var bf = 0.80 / s.braking; // stronger braking => closer to 0
      M.Body.setAngularVelocity(this.rearWheel, this.rearWheel.angularVelocity * bf);
      M.Body.setAngularVelocity(this.frontWheel, this.frontWheel.angularVelocity * bf);
      // gentle reverse
      if (Math.abs(this.chassis.velocity.x) < 3) {
        M.Body.setAngularVelocity(this.rearWheel, this.rearWheel.angularVelocity - 0.03 * s.acceleration);
      }
      this.throttle = -1;
    } else {
      this.throttle = 0;
    }

    // Lean (chassis torque) -----------------------------------------
    var lean = 0.055;
    if (input.leanFwd) this.chassis.torque += lean;   // nose down (clockwise)
    if (input.leanBack) this.chassis.torque -= lean;  // nose up (anti-clockwise)

    // Jump ----------------------------------------------------------
    if (input.jump && onGround && !this._jumpLatch) {
      var jv = -9.5 * s.jump;
      var self = this;
      [this.chassis, this.rearWheel, this.frontWheel].forEach(function (b) {
        M.Body.setVelocity(b, { x: b.velocity.x, y: jv });
      });
      this._jumpLatch = true;
    }
    if (!input.jump) this._jumpLatch = false;
  };

  GameEngine.prototype.step = function (fixedDeltaMs) {
    if (!this.engine) return;
    M.Engine.update(this.engine, fixedDeltaMs);

    if (!this.finished && !this.crashed) {
      this.elapsed = (performance.now() - this.startTime) / 1000;
    }
    // Fell into a gap
    if (this.chassis && this.chassis.position.y > this.worldBottom) this.crashed = true;
    // Reached finish
    if (this.chassis && !this.crashed && this.chassis.position.x >= this.level.finishX) {
      this.finished = true;
    }
  };

  GameEngine.prototype.getSpeed = function () {
    if (!this.chassis) return 0;
    var v = this.chassis.velocity;
    return Math.sqrt(v.x * v.x + v.y * v.y);
  };

  GameEngine.prototype.getProgress = function () {
    if (!this.chassis) return 0;
    var span = this.level.finishX - this.level.startX;
    return Math.max(0, Math.min(1, (this.chassis.position.x - this.level.startX) / span));
  };

  GameEngine.prototype.getRenderData = function () {
    return {
      chassis: { x: this.chassis.position.x, y: this.chassis.position.y, angle: this.chassis.angle },
      rear: { x: this.rearWheel.position.x, y: this.rearWheel.position.y, angle: this.rearWheel.angle },
      front: { x: this.frontWheel.position.x, y: this.frontWheel.position.y, angle: this.frontWheel.angle },
      wheelBase: this.wheelBase,
      wheelRadius: this.wheelRadius,
      onGround: this.isOnGround(),
      throttle: this.throttle,
      speed: this.getSpeed()
    };
  };

  GameEngine.prototype.getCameraTarget = function () {
    return { x: this.chassis.position.x, y: this.chassis.position.y };
  };

  GameEngine.prototype.destroy = function () {
    if (this.engine) {
      M.Events.off(this.engine);
      M.World.clear(this.world, false);
      M.Engine.clear(this.engine);
    }
    this.engine = null;
  };

  global.GameEngine = GameEngine;
})(window);
