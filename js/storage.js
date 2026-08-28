/* storage.js - LocalStorage persistence for Neon Bike Rush */
(function (global) {
  'use strict';

  var KEY = 'neonBikeRush.save.v1';

  var DEFAULT_UPGRADES = function () {
    return { acceleration: 0, topSpeed: 0, braking: 0, jump: 0, grip: 0 };
  };

  function defaultData() {
    return {
      selectedBike: 0,
      coins: 0,
      totalCoinsEarned: 0,
      // levelsCompleted maps levelId -> { stars: 1..3, bestTime: seconds }
      levelsCompleted: {},
      bikes: [
        { upgrades: DEFAULT_UPGRADES() },
        { upgrades: DEFAULT_UPGRADES() },
        { upgrades: DEFAULT_UPGRADES() },
        { upgrades: DEFAULT_UPGRADES() }
      ],
      settings: { sound: true, particles: true }
    };
  }

  var Save = {
    data: null,

    load: function () {
      try {
        var raw = global.localStorage.getItem(KEY);
        if (raw) {
          var parsed = JSON.parse(raw);
          this.data = this._merge(defaultData(), parsed);
        } else {
          this.data = defaultData();
        }
      } catch (e) {
        this.data = defaultData();
      }
      return this.data;
    },

    _merge: function (base, over) {
      if (over == null) return base;
      Object.keys(over).forEach(function (k) {
        if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) &&
            typeof over[k] === 'object' && !Array.isArray(over[k])) {
          Save._merge(base[k], over[k]);
        } else if (over[k] !== undefined) {
          base[k] = over[k];
        }
      });
      // Ensure bikes array is valid
      if (!Array.isArray(base.bikes) || base.bikes.length < 4) {
        var arr = base.bikes && Array.isArray(base.bikes) ? base.bikes : [];
        while (arr.length < 4) arr.push({ upgrades: DEFAULT_UPGRADES() });
        base.bikes = arr;
      }
      base.bikes.forEach(function (b) {
        if (!b.upgrades) b.upgrades = DEFAULT_UPGRADES();
        ['acceleration', 'topSpeed', 'braking', 'jump', 'grip'].forEach(function (s) {
          if (typeof b.upgrades[s] !== 'number') b.upgrades[s] = 0;
        });
      });
      return base;
    },

    save: function () {
      try {
        global.localStorage.setItem(KEY, JSON.stringify(this.data));
      } catch (e) { /* storage may be unavailable */ }
    },

    reset: function () {
      this.data = defaultData();
      this.save();
    },

    // ---- Convenience accessors ----
    getCoins: function () { return this.data.coins; },

    addCoins: function (n) {
      this.data.coins += n;
      this.data.totalCoinsEarned += n;
      this.save();
    },

    spendCoins: function (n) {
      if (this.data.coins >= n) {
        this.data.coins -= n;
        this.save();
        return true;
      }
      return false;
    },

    getSelectedBike: function () { return this.data.selectedBike; },
    setSelectedBike: function (i) { this.data.selectedBike = i; this.save(); },

    getUpgrades: function (bikeIndex) { return this.data.bikes[bikeIndex].upgrades; },

    setUpgrade: function (bikeIndex, stat, level) {
      this.data.bikes[bikeIndex].upgrades[stat] = level;
      this.save();
    },

    isLevelUnlocked: function (levelId) {
      if (levelId <= 1) return true;
      return !!this.data.levelsCompleted[levelId - 1];
    },

    isLevelCompleted: function (levelId) {
      return !!this.data.levelsCompleted[levelId];
    },

    getLevelResult: function (levelId) {
      return this.data.levelsCompleted[levelId] || null;
    },

    completeLevel: function (levelId, stars, time, coinsReward) {
      var existing = this.data.levelsCompleted[levelId];
      var firstTime = !existing;
      var bestStars = existing ? Math.max(existing.stars, stars) : stars;
      var bestTime = existing ? Math.min(existing.bestTime, time) : time;
      this.data.levelsCompleted[levelId] = { stars: bestStars, bestTime: bestTime };
      // Award coins (full reward first time, small reward on replay)
      var reward = firstTime ? coinsReward : Math.floor(coinsReward * 0.25);
      this.addCoins(reward);
      this.save();
      return { firstTime: firstTime, reward: reward, stars: bestStars };
    },

    countCompleted: function () {
      return Object.keys(this.data.levelsCompleted).length;
    }
  };

  global.Save = Save;
})(window);
