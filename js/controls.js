/* controls.js - Keyboard + touch input */
(function (global) {
  'use strict';

  function Controls(canvas) {
    this.canvas = canvas;
    this.input = { gas: false, brake: false, jump: false, leanFwd: false, leanBack: false };
    this.onRestart = null;
    this.onPointerDown = null;
    this.onMenu = null;
    this._bindKeyboard();
    this._bindTouchButtons();
    this._bindPointer();
  }

  Controls.prototype._bindKeyboard = function () {
    var self = this;
    var map = {
      'ArrowRight': 'gas', 'KeyD': 'gas',
      'ArrowLeft': 'brake', 'KeyA': 'brake',
      'ArrowUp': 'jump', 'KeyW': 'jump',
      'KeyZ': 'leanBack', 'KeyQ': 'leanBack',
      'KeyX': 'leanFwd', 'KeyE': 'leanFwd'
    };
    global.addEventListener('keydown', function (e) {
      if (map[e.code] !== undefined) {
        self.input[map[e.code]] = true;
        e.preventDefault();
      }
      if (e.code === 'KeyR') { if (self.onRestart) self.onRestart(); }
      if (e.code === 'Escape') { if (self.onMenu) self.onMenu(); }
    });
    global.addEventListener('keyup', function (e) {
      if (map[e.code] !== undefined) {
        self.input[map[e.code]] = false;
        e.preventDefault();
      }
    });
    // Safety: drop all inputs when window loses focus
    global.addEventListener('blur', function () { self.releaseAll(); });
  };

  Controls.prototype._bindTouchButtons = function () {
    var self = this;
    var btns = document.querySelectorAll('#touch-controls .touch-btn');
    Array.prototype.forEach.call(btns, function (btn) {
      var control = btn.getAttribute('data-control');
      var press = function (e) { e.preventDefault(); self.input[control] = true; };
      var release = function (e) { if (e) e.preventDefault(); self.input[control] = false; };
      btn.addEventListener('touchstart', press, { passive: false });
      btn.addEventListener('touchend', release, { passive: false });
      btn.addEventListener('touchcancel', release, { passive: false });
      btn.addEventListener('mousedown', press);
      btn.addEventListener('mouseup', release);
      btn.addEventListener('mouseleave', release);
    });
  };

  Controls.prototype._bindPointer = function () {
    var self = this;
    var handler = function (clientX, clientY) {
      if (!self.onPointerDown) return;
      var rect = self.canvas.getBoundingClientRect();
      self.onPointerDown(clientX - rect.left, clientY - rect.top);
    };
    this.canvas.addEventListener('mousedown', function (e) { handler(e.clientX, e.clientY); });
    this.canvas.addEventListener('touchstart', function (e) {
      if (e.touches.length) {
        handler(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
  };

  Controls.prototype.releaseAll = function () {
    this.input.gas = this.input.brake = this.input.jump = false;
    this.input.leanFwd = this.input.leanBack = false;
  };

  Controls.prototype.showTouch = function (show) {
    var el = document.getElementById('touch-controls');
    if (el) el.classList.toggle('hidden', !show);
  };

  Controls.prototype.isTouchDevice = function () {
    return ('ontouchstart' in global) || navigator.maxTouchPoints > 0;
  };

  global.Controls = Controls;
})(window);
